import subprocess, json, os
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
jwt_token = json.loads(r.stdout)['accessToken']
bearer_value = 'Authorization: Bearer *** + jwt_token

r2 = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/jellyfin/items?limit=3',
    '-H', bearer_value], capture_output=True, text=True)
items = json.loads(r2.stdout)
for i in items[:3]:
    print(f'ID: {i["id"]} Name: {i["name"]} Type: {i["type"]} ExternalID: {i["externalId"]}')

real_id = items[0]['externalId']
print(f'\nTesting with external ID: {real_id}')

# Direct Jellyfin test - simple stream
r3 = subprocess.run(['curl', '-s', '-D', '-',
    f'http://192.168.31.35:8096/Videos/{real_id}/stream?audioCodec=aac',
    '-H', 'X-Emby-Token: 0fde01a7adda4a40a3281c1cd3af1c5d',
    '-o', os.devnull], capture_output=True, text=True)
print('Direct Jellyfin (audioCodec=aac):', r3.stdout[:400])

# Backend proxy test
r4 = subprocess.run(['curl', '-s', '-D', '-',
    f'http://localhost:3007/api/v1/jellyfin/items/{items[0]["id"]}/stream?token={jwt_token}',
    '-o', os.devnull], capture_output=True, text=True)
print('Backend proxy:', r4.stdout[:400])
