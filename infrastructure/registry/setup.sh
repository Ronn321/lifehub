#!/bin/bash
# LifeHub Private Registry Setup
# Fuehrt dieses Skript einmalig auf dem NAS aus.
# Benoetigt: Docker

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AUTH_DIR="$SCRIPT_DIR/auth"

echo "=== LifeHub Docker Registry Setup ==="

# Auth-Verzeichnis erstellen
mkdir -p "$AUTH_DIR"

# Passwort abfragen
echo ""
echo "Bitte Passwort fuer die Docker Registry eingeben:"
read -rsp "Passwort: " REGISTRY_PASS
echo ""

if [ -z "$REGISTRY_PASS" ]; then
  echo "Fehler: Passwort darf nicht leer sein."
  exit 1
fi

# htpasswd generieren via Docker (kein htpasswd-Tool auf NAS noetig)
echo "Generiere htpasswd..."
docker run --rm --entrypoint htpasswd httpd:2 -Bbn lifehub "$REGISTRY_PASS" > "$AUTH_DIR/htpasswd"

# Berechtigungen setzen
chmod 600 "$AUTH_DIR/htpasswd"

echo ""
echo "=== Registry-Setup abgeschlossen ==="
echo ""
echo "Starte Registry mit:"
echo "  cd $SCRIPT_DIR && docker compose up -d"
echo ""
echo "Registry ist erreichbar unter:"
echo "  <NAS-Tailscale-IP>:5000"
echo ""
echo "Login mit:"
echo "  docker login <NAS-Tailscale-IP>:5000"
echo "  Benutzer: lifehub"
echo "  Passwort: <dein Passwort>"
