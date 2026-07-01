-- LifeHub Postgres Init (siehe DATABASE_SCHEMA.md §4.2 + ARCHITECTURE.md)
-- Wird beim ersten Container-Start ausgeführt (docker-entrypoint-initdb.d)

-- Pflicht-Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- citext-User-Email (case-insensitive Login)
-- (Eigentliche Spalte ist text + COLLATE, aber citext als Helper für andere Tables)

-- pgcrypto für gen_random_bytes() (TOTP, Tokens)
-- pgcrypto loaded via extension oben
