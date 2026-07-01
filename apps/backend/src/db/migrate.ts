import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const migrationsDir = join(__dirname, '..', '..', 'drizzle');

async function ensureMigrationsTable(sql: postgres.Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS public._migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const sql = postgres(url, { max: 1, prepare: false });

  try {
    await ensureMigrationsTable(sql);

    const applied = new Set(
      (await sql<{ filename: string }[]>`SELECT filename FROM public._migrations`).map((r) => r.filename),
    );

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`⏭  Skip ${file} (already applied)`);
        continue;
      }

      console.log(`▶  Apply ${file}`);
      const content = readFileSync(join(migrationsDir, file), 'utf8');
      await sql.unsafe(content);
      await sql`INSERT INTO public._migrations (filename) VALUES (${file})`;
      count++;
      console.log(`✅ ${file}`);
    }

    console.log(count === 0 ? '✅ No new migrations' : `🎉 Applied ${count} migration(s)`);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

void run();
