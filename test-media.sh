#!/bin/bash
# LifeHub Media API Test
echo "=== Step 1: Login ==="
RESP=*** -s -X POST http://localhost:3007/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lifehub.local","password":"admin12345"}')
TOKEN=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
echo "Token erhalten: ${TOKEN:0:20}..."

echo ""
echo "=== Step 2: Media Source anlegen ==="
curl -s -X POST http://localhost:3007/api/v1/media/sources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer *** \
  -d '{"name":"NAS Urlaubsfotos","type":"nas_path","path":"/mnt/media/photos","autoIndex":true}' | python3 -m json.tool

echo ""
echo "=== Step 3: Quellen auflisten ==="
curl -s http://localhost:3007/api/v1/media/sources \
  -H "Authorization: Bearer *** | python3 -m json.tool

echo ""
echo "=== Step 4: Album anlegen ==="
curl -s -X POST http://localhost:3007/api/v1/media/albums \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer *** \
  -d '{"name":"Italien 2025","type":"travel","description":"Unser Sommerurlaub"}' | python3 -m json.tool
