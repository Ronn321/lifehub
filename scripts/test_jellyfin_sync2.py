import subprocess, json

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
login_data = json.loads(r.stdout)
tok_val = login_data['accessToken']
auth_hdr_val = 'Authorization: Bearer *** + tok_val

r2 = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/jellyfin/servers/b8a812a5-16b2-4be7-af74-1b878446383c/sync',
    '-X', 'POST', '-H', auth_hdr_val], capture_output=True, text=True)
print('Sync:', r2.stdout[:500])

r3 = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/jellyfin/libraries',
    '-H', auth_hdr_val], capture_output=True, text=True)
print('Libraries:', r3.stdout[:500])
