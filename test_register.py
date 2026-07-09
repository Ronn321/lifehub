import json, subprocess

r = subprocess.run(['curl', '-s', '-X', 'POST', 'http://localhost:3007/api/v1/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
data = json.loads(r.stdout)
token = data.get('accessToken', '')
hdr = 'Authorization: Bearer ' + token
print('Login: OK, token:', token[:20])

# Register
r = subprocess.run(['curl', '-s', '-X', 'POST', 'http://localhost:3007/api/v1/auth/register',
    '-H', 'Content-Type: application/json', '-H', hdr,
    '-d', '{"email":"test@lifehub.local","password":"test12345","displayName":"Test"}'],
    capture_output=True, text=True)
print('Register:', r.stdout[:300])

# Users
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/users', '-H', hdr],
    capture_output=True, text=True)
print('Users:', r.stdout[:300])
