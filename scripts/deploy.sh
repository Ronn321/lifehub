#!/bin/bash
# LifeHub Deploy Script
# Baut Docker Images und pushed sie zur privaten Registry auf dem NAS.
# Nutzung: ./scripts/deploy.sh [VERSION] [REGISTRY]
# Beispiel: ./scripts/deploy.sh v0.1.0 100.64.0.1:5000

set -e

VERSION=${1:-latest}
REGISTRY=${LIFEHUB_REGISTRY:-${2:-localhost:5000}}

echo "============================================"
echo "  LifeHub Deploy"
echo "  Version:  $VERSION"
echo "  Registry: $REGISTRY"
echo "============================================"
echo ""

# Pruefen ob Docker laeuft
if ! docker info > /dev/null 2>&1; then
  echo "Fehler: Docker laeuft nicht. Bitte starte Docker Desktop."
  exit 1
fi

# Backend Image bauen
echo "[1/4] Building backend:$VERSION..."
docker build \
  -t "$REGISTRY/lifehub-backend:$VERSION" \
  -t "$REGISTRY/lifehub-backend:latest" \
  -f apps/backend/Dockerfile \
  .
echo "  Backend Image gebaut."

# Frontend Image bauen
echo "[2/4] Building frontend:$VERSION..."
docker build \
  -t "$REGISTRY/lifehub-frontend:$VERSION" \
  -t "$REGISTRY/lifehub-frontend:latest" \
  -f apps/frontend/Dockerfile \
  .
echo "  Frontend Image gebaut."

# Push zur Registry
echo "[3/4] Pushing backend:$VERSION to $REGISTRY..."
docker push "$REGISTRY/lifehub-backend:$VERSION"
docker push "$REGISTRY/lifehub-backend:latest"

echo "[4/4] Pushing frontend:$VERSION to $REGISTRY..."
docker push "$REGISTRY/lifehub-frontend:$VERSION"
docker push "$REGISTRY/lifehub-frontend:latest"

echo ""
echo "============================================"
echo "  Deploy erfolgreich!"
echo "============================================"
echo ""
echo "Images gepushed:"
echo "  $REGISTRY/lifehub-backend:$VERSION"
echo "  $REGISTRY/lifehub-frontend:$VERSION"
echo ""
echo "Auf dem NAS jetzt ausfuehren:"
echo "  cd /volume1/docker/lifehub"
echo "  docker compose pull"
echo "  docker compose up -d"
