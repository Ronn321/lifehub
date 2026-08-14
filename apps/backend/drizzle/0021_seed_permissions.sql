-- 0021_seed_permissions.sql
-- Seeds ALLE Permissions (alle Domains x 6er-Set) + Standard-Rollen-Mappings.
-- Idempotent: ON CONFLICT (domain, action) DO NOTHING + NOT EXISTS-Guards.
-- Fix: Permissions fehlten auf frischen DBs -> Permission-Matrix leer, Zuweisung unmöglich.

-- Standardrollen sicherstellen (id explizit: roles.id hat in älteren DBs keinen DEFAULT)
INSERT INTO roles (id, name, description, is_system) VALUES
  (gen_random_uuid(), 'admin', 'Administrator', true),
  (gen_random_uuid(), 'user', 'Familienmitglied', true),
  (gen_random_uuid(), 'viewer', 'Nur-Lesen', true),
  (gen_random_uuid(), 'guest', 'Gast', true)
ON CONFLICT (name) DO NOTHING;

-- Alle Permissions (domain x action), idempotent
INSERT INTO permissions (id, domain, action)
SELECT gen_random_uuid(), v.domain, v.action
FROM (VALUES
  ('browser', 'admin'), ('browser', 'create'), ('browser', 'delete'), ('browser', 'read'), ('browser', 'share'), ('browser', 'update'),
  ('calendar', 'admin'), ('calendar', 'create'), ('calendar', 'delete'), ('calendar', 'read'), ('calendar', 'share'), ('calendar', 'update'),
  ('dashboard', 'admin'), ('dashboard', 'create'), ('dashboard', 'delete'), ('dashboard', 'read'), ('dashboard', 'share'), ('dashboard', 'update'),
  ('documents', 'admin'), ('documents', 'create'), ('documents', 'delete'), ('documents', 'read'), ('documents', 'share'), ('documents', 'update'),
  ('email', 'admin'), ('email', 'create'), ('email', 'delete'), ('email', 'read'), ('email', 'share'), ('email', 'update'),
  ('finance', 'admin'), ('finance', 'create'), ('finance', 'delete'), ('finance', 'read'), ('finance', 'share'), ('finance', 'update'),
  ('insurance', 'admin'), ('insurance', 'create'), ('insurance', 'delete'), ('insurance', 'read'), ('insurance', 'share'), ('insurance', 'update'),
  ('integrations', 'admin'), ('integrations', 'create'), ('integrations', 'delete'), ('integrations', 'read'), ('integrations', 'share'), ('integrations', 'update'),
  ('it_inventory', 'admin'), ('it_inventory', 'create'), ('it_inventory', 'delete'), ('it_inventory', 'read'), ('it_inventory', 'share'), ('it_inventory', 'update'),
  ('jellyfin', 'admin'), ('jellyfin', 'create'), ('jellyfin', 'delete'), ('jellyfin', 'read'), ('jellyfin', 'share'), ('jellyfin', 'update'),
  ('media', 'admin'), ('media', 'create'), ('media', 'delete'), ('media', 'read'), ('media', 'share'), ('media', 'update'),
  ('pages', 'admin'), ('pages', 'create'), ('pages', 'delete'), ('pages', 'read'), ('pages', 'share'), ('pages', 'update'),
  ('plugins', 'admin'), ('plugins', 'create'), ('plugins', 'delete'), ('plugins', 'read'), ('plugins', 'share'), ('plugins', 'update'),
  ('projects', 'admin'), ('projects', 'create'), ('projects', 'delete'), ('projects', 'read'), ('projects', 'share'), ('projects', 'update'),
  ('recipes', 'admin'), ('recipes', 'create'), ('recipes', 'delete'), ('recipes', 'read'), ('recipes', 'share'), ('recipes', 'update'),
  ('search', 'admin'), ('search', 'create'), ('search', 'delete'), ('search', 'read'), ('search', 'share'), ('search', 'update'),
  ('shopping', 'admin'), ('shopping', 'create'), ('shopping', 'delete'), ('shopping', 'read'), ('shopping', 'share'), ('shopping', 'update'),
  ('travel', 'admin'), ('travel', 'create'), ('travel', 'delete'), ('travel', 'read'), ('travel', 'share'), ('travel', 'update'),
  ('users', 'admin'), ('users', 'create'), ('users', 'delete'), ('users', 'read'), ('users', 'share'), ('users', 'update'),
  ('vault', 'admin'), ('vault', 'create'), ('vault', 'delete'), ('vault', 'read'), ('vault', 'share'), ('vault', 'update')
) AS v(domain, action)
ON CONFLICT (domain, action) DO NOTHING;

-- Standard-Mappings (idempotent via NOT EXISTS)
-- admin: alle Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin' AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

-- user: alle read + create
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'user' AND p.action IN ('read', 'create') AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

-- viewer: alle read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'viewer' AND p.action = 'read' AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
