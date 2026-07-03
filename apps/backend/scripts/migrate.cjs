#!/usr/bin/env node
// LifeHub DB Migration Runner (CommonJS)
// Läuft ohne tsx/Eigen — direkt mit `node`.
// Liest SQL-Dateien aus drizzle/ und wendet sie in Reihenfolge an.
// Tracking via `_migrations` Tabelle (idempotent).

const { readFileSync, readdirSync, existsSync } = require('node:fs');
const { join } = require('node:path');

// dotenv laden
try { require('dotenv').config(); } catch {}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

async function run() {
  const { default: postgres } = await import('postgres');
  const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

  try {
    // Migration-Tracking-Tabelle anlegen
    await sql`
      CREATE TABLE IF NOT EXISTS public._migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // Bereits angewandte Migrations laden
    const applied = new Set(
      (await sql`SELECT filename FROM public._migrations`).map(r => r.filename)
    );

    // Migrations-Verzeichnis relativ zu diesem Script
    const migrationsDir = join(__dirname, '..', 'drizzle');
    if (!existsSync(migrationsDir)) {
      console.log('⚠ Migrations directory not found, skipping.');
      return;
    }

    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
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

    if (count === 0) {
      console.log('✅ No new migrations');
    } else {
      console.log(`🎉 Applied ${count} migration(s)`);
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message || err);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

run();
