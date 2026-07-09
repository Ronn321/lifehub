import subprocess, json, os
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
login_data = json.loads(r.stdout)
the_key = login_data['accessToken']
bearer_prefix = 'Authorization: Bearer '
bearer_header = bearer_prefix + the_key

r2 = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/jellyfin/items?limit=3',
    '-H', bearer_header], capture_output=True, text=True)
items = json.loads(r2.stdout)
for i in items[:3]:
    print(f'ID: {i["id"]} Name: {i["name"]} Type: {i["type"]} ExternalID: {i["externalId"]}')

real_id = items[0]['externalId']
print(f'Testing external ID: {real_id}')

r3 = subprocess.run(['curl', '-s', '-D', '-',
    f'http://192.168.31.35:8096/Videos/{real_id}/stream?audioCodec=aac',
    '-H', 'X-Emby-Token: 0fde01a7adda4a40a3281c1cd3af1c5d',
    '-o', os.devnull], capture_output=True, text=True)
print('Direct JF:', r3.stdout[:400])

r4 = subprocess.run(['curl', '-s', '-D', '-',
    f'http://localhost:3007/api/v1/jellyfin/items/{items[0]["id"]}/stream?token={the_key}',
    '-o', os.devnull], capture_output=True, text=True)
print('Backend:', r4.stdout[:400])
