#!/usr/bin/env bash
# Generates RS256 keypair for JWT and writes base64-encoded values to .env
# Usage: bash infrastructure/scripts/generate-jwt-keys.sh
set -euo pipefail

cd "$(dirname "$0")/../.."

PRIV_PEM="infrastructure/scripts/jwt_private.pem"
PUB_PEM="infrastructure/scripts/jwt_public.pem"

echo "▶  Generating RS256 keypair (2048-bit)..."
openssl genpkey -algorithm RSA -out "$PRIV_PEM" -pkeyopt rsa_keygen_bits:2048 2>/dev/null
openssl rsa -in "$PRIV_PEM" -pubout -out "$PUB_PEM" 2>/dev/null

PRIV_B64=$(base64 -w0 < "$PRIV_PEM")
PUB_B64=$(base64 -w0 < "$PUB_PEM")

# Append or update .env
if [ -f .env ]; then
  # Remove existing lines
  sed -i.bak '/^JWT_PRIVATE_KEY_BASE64=/d' .env 2>/dev/null || true
  sed -i.bak '/^JWT_PUBLIC_KEY_BASE64=/d' .env 2>/dev/null || true
  rm -f .env.bak
fi

{
  echo "JWT_PRIVATE_KEY_BASE64=$PRIV_B64"
  echo "JWT_PUBLIC_KEY_BASE64=$PUB_B64"
} >> .env

echo "✅ JWT keys generated and written to .env"
echo "   Private key: $PRIV_PEM (do NOT commit)"
echo "   Public key:  $PUB_PEM (do NOT commit)"
