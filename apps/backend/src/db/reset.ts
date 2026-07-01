import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

async function main() {
  console.log('⚠️  RESET: dropping all data in public schema (kein DROP SCHEMA, nur TRUNCATE)');
  await sql`
    TRUNCATE TABLE
      public.audit_logs,
      public.sessions,
      public.user_roles,
      public.role_permissions,
      public.domain_events,
      public.tags,
      public.permissions,
      public.roles,
      public.groups,
      public.users,
      public._migrations
    RESTART IDENTITY CASCADE
  `;
  console.log('✅ Public schema truncated');
}

try {
  await main();
} catch (err) {
  console.error('❌ Reset failed:', err);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
