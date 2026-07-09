import json, subprocess

# Step 1: Login
r = subprocess.run(['curl', '-s', '-X', 'POST', 'http://localhost:3007/api/v1/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
data = json.loads(r.stdout)
token = data.get('accessToken', '')
print('1. Login:', data.get('user', {}).get('email', '?'))

# Step 2: List sources
auth = 'Authorization: Bearer *** + token
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/media/sources', '-H', auth], capture_output=True, text=True)
sources = json.loads(r.stdout)
print(f'2. Sources: {len(sources)}')
for s in sources:
    print(f'   - {s["name"]} ({s["type"]}) -> {s["path"]}')

# Step 3: List albums
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/media/albums', '-H', auth], capture_output=True, text=True)
albums = json.loads(r.stdout)
print(f'3. Albums: {len(albums)}')
for a in albums:
    print(f'   - {a["name"]} ({a["type"]})')

print('\n✅ Backend funktioniert!')
print('   Frontend 401: Token-Storage-Key Mismatch (lifehub-auth ist da, aber "auth-storage" wurde gelesen).')
