import subprocess, json

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
the_tok = json.loads(r.stdout)['accessToken']
print('Login OK')

auth_hdr = 'Authorization: Bearer *** + the_tok

# Test jellyfin libraries from backend
r2 = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/jellyfin/libraries',
    '-H', auth_hdr], capture_output=True, text=True)
print('Libraries:', r2.stdout[:400])

# Test items
r3 = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/jellyfin/items',
    '-H', auth_hdr], capture_output=True, text=True)
print('Items:', r3.stdout[:400])
