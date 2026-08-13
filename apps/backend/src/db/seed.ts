import 'dotenv/config';
import postgres from 'postgres';
import argon2 from 'argon2';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

const DOMAINS = [
  'users', 'media', 'travel', 'projects', 'recipes', 'shopping',
  'finance', 'insurance', 'vault', 'documents', 'calendar',
  'it_inventory', 'jellyfin', 'search', 'dashboard', 'plugins',
  'email', 'integrations',
] as const;

const ACTIONS = ['read', 'create', 'update', 'delete', 'share', 'admin'] as const;

const SYSTEM_ROLES = [
  { name: 'admin',  description: 'Vollzugriff auf alle Module' },
  { name: 'family', description: 'Alle Module außer User-Admin' },
  { name: 'child',  description: 'Eingeschränkte Sicht (kein Vault/Finance/Insurance/IT/Users/Plugins)' },
  { name: 'guest',  description: 'Read-only auf freigegebene Inhalte' },
] as const;

const CHILD_BLOCKED_DOMAINS = new Set([
  'finance', 'vault', 'insurance', 'it_inventory', 'users', 'plugins',
]);

const GUEST_ALLOWED_ACTIONS = new Set(['read']);

async function seedRolesAndPermissions() {
  console.log('▶  Seed roles + permissions');

  for (const r of SYSTEM_ROLES) {
    await sql`
      INSERT INTO public.roles (id, name, description, is_system)
      VALUES (gen_random_uuid(), ${r.name}, ${r.description}, TRUE)
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    `;
  }

  for (const domain of DOMAINS) {
    for (const action of ACTIONS) {
      await sql`
        INSERT INTO public.permissions (id, domain, action)
        VALUES (gen_random_uuid(), ${domain}, ${action})
        ON CONFLICT (domain, action) DO NOTHING
      `;
    }
  }

  // admin: alle
  await sql`
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM public.roles r, public.permissions p
    WHERE r.name = 'admin'
    ON CONFLICT DO NOTHING
  `;

  // family: alle außer admin-Action
  await sql`
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM public.roles r, public.permissions p
    WHERE r.name = 'family' AND p.action <> 'admin'
    ON CONFLICT DO NOTHING
  `;

  // child: keine finance/vault/insurance/it_inventory/users/plugins
  await sql`
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM public.roles r, public.permissions p
    WHERE r.name = 'child'
      AND p.domain NOT IN ('finance', 'vault', 'insurance', 'it_inventory', 'users', 'plugins')
    ON CONFLICT DO NOTHING
  `;

  // guest: nur read
  await sql`
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM public.roles r, public.permissions p
    WHERE r.name = 'guest' AND p.action = 'read'
    ON CONFLICT DO NOTHING
  `;

  // Counts verifizieren
  const pcountResult = await sql<{ count: string }[]>`SELECT count(*)::text FROM public.permissions`;
  const rcountResult = await sql<{ count: string }[]>`SELECT count(*)::text FROM public.roles`;
  const pcount = pcountResult[0]?.count ?? '0';
  const rcount = rcountResult[0]?.count ?? '0';
  console.log(`   Roles: ${rcount}, Permissions: ${pcount} (erwartet: 4, 108)`);

  if (Number(pcount) !== 108) {
    throw new Error(`❌ Erwartet 108 Permissions, gefunden ${pcount}`);
  }
  if (Number(rcount) !== 4) {
    throw new Error(`❌ Erwartet 4 Rollen, gefunden ${rcount}`);
  }
}

async function seedAdminUser() {
  console.log('▶  Seed admin user');

  const email = 'admin@lifehub.local';
  const password = 'admin12345';
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 64 * 1024,
    timeCost: 3,
    parallelism: 4,
  });

  // Upsert admin user
  const [user] = await sql<{ id: string }[]>`
    INSERT INTO public.users (id, email, display_name, password_hash)
    VALUES (gen_random_uuid(), ${email}, 'Admin', ${passwordHash})
    ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        updated_at = now()
    RETURNING id
  `;
  if (!user) throw new Error('Failed to create admin user');

  // Admin-Rolle zuweisen
  await sql`
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT ${user.id}, r.id FROM public.roles r WHERE r.name = 'admin'
    ON CONFLICT DO NOTHING
  `;

  console.log(`   Admin: ${email} / ${password}  (BITTE ÄNDERN in Production!)`);
}

async function main() {
  try {
    await seedRolesAndPermissions();
    await seedAdminUser();
    console.log('🎉 Seed complete');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

void main();
