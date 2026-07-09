import json, subprocess

# Login 
r = subprocess.run(['curl', '-s', '-X', 'POST', 'http://localhost:3007/api/v1/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
data = json.loads(r.stdout)
token = data.get('accessToken', '')
print('1. Login OK: ' + token[:20])

# Register with auth
auth_hdr = 'Authorization: Bearer ' + token
body = '{"email":"t4@lifehub.local","password":"test12345","displayName":"Test4"}'
r = subprocess.run(['curl', '-s', '-X', 'POST', 'http://localhost:3007/api/v1/auth/register',
    '-H', 'Content-Type: application/json', '-H', auth_hdr, '-d', body], capture_output=True, text=True)
print('2. Register: ' + r.stdout[:300])

# Also test Login with this new user
r = subprocess.run(['curl', '-s', '-X', 'POST', 'http://localhost:3007/api/v1/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"t4@lifehub.local","password":"test12345"}'],
    capture_output=True, text=True)
print('3. New user login: ' + r.stdout[:200])
