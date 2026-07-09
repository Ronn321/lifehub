import json, subprocess

pwd = "admin12345"
r = subprocess.run(['curl', '-s', '-X', 'POST', 'http://localhost:3007/api/v1/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"%s"}' % pwd],
    capture_output=True, text=True)
data = json.loads(r.stdout)
token = data.get('accessToken', '')
h = 'Authorization: Bearer %s' % token

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/users', '-H', h], capture_output=True, text=True)
users = json.loads(r.stdout)
for k in sorted(users[0].keys()):
    val = str(users[0][k])[:60]
    print('  %s: %s' % (k, val))
