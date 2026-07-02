#!/bin/bash
# LifeHub Deploy Script
# Baut Docker Images und pushed sie zu ghcr.io (GitHub Container Registry).
# Nutzung: ./scripts/deploy.sh [VERSION]
# Beispiel: ./scripts/deploy.sh v0.1.0

set -e

VERSION=${1:-latest}
REGISTRY="ghcr.io/ronn321"

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

# GHCR Login (Token muss gesetzt sein oder gh CLI muss eingeloggt sein)
if [ -n "$GITHUB_TOKEN" ]; then
  echo "$GITHUB_TOKEN" | docker login ghcr.io -u Ronn321 --password-stdin
elif command -v gh &> /dev/null; then
  gh auth token | docker login ghcr.io -u Ronn321 --password-stdin
else
  echo "Warnung: Kein GITHUB_TOKEN gesetzt und gh CLI nicht installiert."
  echo "Bitte manuell: docker login ghcr.io"
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

# Push zu GHCR
echo "[3/4] Pushing backend:$VERSION..."
docker push "$REGISTRY/lifehub-backend:$VERSION"
docker push "$REGISTRY/lifehub-backend:latest"

echo "[4/4] Pushing frontend:$VERSION..."
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
echo "  docker compose pull"
echo "  docker compose up -d"
