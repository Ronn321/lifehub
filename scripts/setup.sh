#!/usr/bin/env bash
# ==============================================================
# LifeHub Setup — NAS Deployment (Plex-like)
# ==============================================================
# Einmal ausführen, und LifeHub läuft.
#
# Usage:
#   ./setup.sh                    # Setup mit interaktiven Werten
#   ./setup.sh --auto             # Setup mit Defaults (quick start)
#   ./setup.sh --config-only      # Nur .env generieren, nichts starten
# ==============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
ENV_FILE="$SCRIPT_DIR/.env"
LIFEHUB_DATA="${LIFEHUB_DATA:-./data}"

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  LifeHub NAS Setup${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# --- Docker check ---
if ! docker info >/dev/null 2>&1; then
  echo -e "${RED}❌ Docker läuft nicht. Bitte Docker starten.${NC}"
  echo "   Installation: https://docs.docker.com/engine/install/"
  exit 1
fi

# --- docker compose check ---
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif docker-compose --version >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo -e "${RED}❌ docker compose nicht gefunden.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Docker: $(docker --version)${NC}"
echo -e "${GREEN}✅ Compose: $($DC version 2>/dev/null || echo 'plugin')${NC}"

# --- Prüfe docker-compose.yml ---
if [ ! -f "$COMPOSE_FILE" ]; then
  echo -e "${RED}❌ docker-compose.yml nicht gefunden!${NC}"
  echo "   Bitte in das LifeHub-Verzeichnis wechseln."
  echo "   Oder download: curl -O https://raw.githubusercontent.com/Ronn321/lifehub/main/docker-compose.yml"
  exit 1
fi

# --- Konfiguration ---
AUTO=false
CONFIG_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --auto) AUTO=true ;;
    --config-only) CONFIG_ONLY=true ;;
  esac
done

if [ ! -f "$ENV_FILE" ] || [ "$AUTO" = true ]; then
  echo ""
  echo -e "${YELLOW}── Konfiguration ──${NC}"

  # Passwörter generieren
  POSTGRES_PASSWORD=$(openssl rand -base64 24 2>/dev/null || echo "lifehub_$(date +%s)")
  REDIS_PASSWORD=$(openssl rand -base64 24 2>/dev/null || echo "redis_$(date +%s)")
  MEILI_KEY=$(openssl rand -base64 24 2>/dev/null || echo "meili_$(date +%s)")

  if [ "$AUTO" = true ]; then
    echo -e "  Quick-Start Modus — verwende Defaults und generierte Passwörter."
    FRONTEND_PORT=3100
    BACKEND_PORT=3007
    TZ="Europe/Berlin"
    MEDIA_PHOTOS=""
    MEDIA_VIDEOS=""
    MEDIA_DOCUMENTS=""
    MEDIA_PROJECTS=""
  else
    read -r -p "  Frontend Port [3100]: " FRONTEND_PORT
    FRONTEND_PORT=${FRONTEND_PORT:-3100}

    read -r -p "  Backend Port [3007]: " BACKEND_PORT
    BACKEND_PORT=${BACKEND_PORT:-3007}

    read -r -p "  Zeitzone [Europe/Berlin]: " TZ
    TZ=${TZ:-Europe/Berlin}

    echo ""
    echo "  NAS-Medien-Pfade (leer lassen = nicht mounten):"
    read -r -p "  Photos-Pfad [/volume1/photo]: " MEDIA_PHOTOS
    MEDIA_PHOTOS=${MEDIA_PHOTOS:-/volume1/photo}
    read -r -p "  Videos-Pfad [/volume1/video]: " MEDIA_VIDEOS
    MEDIA_VIDEOS=${MEDIA_VIDEOS:-/volume1/video}
    read -r -p "  Documents-Pfad [/volume1/documents]: " MEDIA_DOCUMENTS
    MEDIA_DOCUMENTS=${MEDIA_DOCUMENTS:-/volume1/documents}
    read -r -p "  Projects-Pfad [/volume1/projects]: " MEDIA_PROJECTS
    MEDIA_PROJECTS=${MEDIA_PROJECTS:-/volume1/projects}
  fi

  # .env schreiben
  cat > "$ENV_FILE" << EOF
# LifeHub Production Environment
# Automatisch generiert am $(date)

# === Ports ===
FRONTEND_PORT=$FRONTEND_PORT
BACKEND_PORT=$BACKEND_PORT

# === Passwörter (generiert) ===
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
MEILI_MASTER_KEY=$MEILI_KEY

# === NAS-Pfade (optional) ===
MEDIA_PHOTOS=$MEDIA_PHOTOS
MEDIA_VIDEOS=$MEDIA_VIDEOS
MEDIA_DOCUMENTS=$MEDIA_DOCUMENTS
MEDIA_PROJECTS=$MEDIA_PROJECTS

# === Allgemein ===
TZ=$TZ
LOG_LEVEL=info
EOF

  echo ""
  echo -e "${GREEN}✅ .env Datei erstellt: $ENV_FILE${NC}"
else
  echo -e "${GREEN}✅ .env existiert bereits — verwende bestehende Konfiguration.${NC}"
fi

# --- Nur Config? ---
if [ "$CONFIG_ONLY" = true ]; then
  echo ""
  echo -e "${GREEN}✅ Konfiguration erstellt. Starte mit:${NC}"
  echo "   $DC -f docker-compose.yml up -d"
  exit 0
fi

# --- Docker Images pullen ---
echo ""
echo -e "${YELLOW}── Docker Images pullen ──${NC}"
echo "  Backend:  ghcr.io/ronn321/lifehub-backend:latest"
echo "  Frontend: ghcr.io/ronn321/lifehub-frontend:latest"
echo "  Postgres: postgres:16-alpine"
echo "  Redis:    redis:7-alpine"
echo "  Search:   getmeili/meilisearch:v1.8"
echo ""

$DC -f "$COMPOSE_FILE" pull 2>&1 || {
  echo -e "${YELLOW}⚠ Pull fehlgeschlagen. Versuche trotzdem zu starten...${NC}"
}

# --- Stack starten ---
echo ""
echo -e "${YELLOW}── LifeHub Stack starten ──${NC}"
$DC -f "$COMPOSE_FILE" up -d --remove-orphans

# --- Warten auf Start ---
echo ""
echo -e "${YELLOW}── Warte auf Start (max 60s) ──${NC}"
for i in $(seq 1 30); do
  sleep 2
  HEALTHY=true
  for svc in postgres redis; do
    STATUS=$($DC -f "$COMPOSE_FILE" ps --format '{{.Status}}' "$svc" 2>/dev/null || echo "")
    if [[ "$STATUS" != *"healthy"* ]]; then
      HEALTHY=false
    fi
  done
  if [ "$HEALTHY" = true ]; then
    echo -e "${GREEN}✅ Postgres + Redis healthy${NC}"
    break
  fi
  echo -n "."
done

# --- Endpunkt-Check ---
for i in $(seq 1 15); do
  sleep 2
  BACKEND_OK=false
  FRONTEND_OK=false

  if curl -s -o /dev/null -w '%{http_code}' http://localhost:${BACKEND_PORT:-3007}/api/v1/system/health 2>/dev/null | grep -q "200"; then
    BACKEND_OK=true
  fi
  if curl -s -o /dev/null -w '%{http_code}' http://localhost:${FRONTEND_PORT:-3100} 2>/dev/null | grep -q "200"; then
    FRONTEND_OK=true
  fi

  if [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then
    break
  fi
  echo -n "."
done

# --- Zusammenfassung ---
echo ""
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}  ✅ LifeHub läuft!${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
echo -e "  Frontend:  ${CYAN}http://localhost:${FRONTEND_PORT:-3100}${NC}"
echo -e "  Backend:   ${CYAN}http://localhost:${BACKEND_PORT:-3007}${NC}"
echo -e "  Health:    ${CYAN}http://localhost:${BACKEND_PORT:-3007}/api/v1/system/health${NC}"
echo ""
echo -e "  ${YELLOW}Erster Login:${NC} Registriere einen User → wird automatisch Admin."
echo ""

# Services anzeigen
$DC -f "$COMPOSE_FILE" ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || true

echo ""
echo -e "${YELLOW}Nützliche Befehle:${NC}"
echo "  Logs:    $DC -f docker-compose.yml logs -f backend"
echo "  Stop:    $DC -f docker-compose.yml down"
echo "  Update:  $DC -f docker-compose.yml pull && $DC -f docker-compose.yml up -d"
echo ""
