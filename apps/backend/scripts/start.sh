#!/bin/sh
set -e

echo "============================================"
echo "  LifeHub Backend Starting"
echo "============================================"

# Migration-Verzeichnis pruefen
MIGRATION_DIR="./apps/backend/drizzle"
if [ -d "$MIGRATION_DIR" ]; then
  echo "[1/2] Running database migrations..."
  cd apps/backend
  npx tsx src/db/migrate.ts || echo "⚠ Migration skipped or failed (non-fatal)"
  cd /app
else
  echo "[1/2] No migration directory found, skipping."
fi

echo "[2/2] Starting API server..."
exec node apps/backend/dist/apps/backend/src/main.js
