import json, subprocess

p = "admin12345"
r = subprocess.run(['curl', '-s', '-X', 'POST', 'http://localhost:3007/api/v1/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"%s"}' % p],
    capture_output=True, text=True)
data = json.loads(r.stdout)
token = data.get('accessToken', '')
auth = 'Authorization: Bearer ' + str(token)

# Users
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/users', '-H', auth],
    capture_output=True, text=True)
d = json.loads(r.stdout)
if isinstance(d, list) and len(d) > 0:
    for k in sorted(d[0].keys()):
        print('  %s: %s' % (k, str(d[0][k])[:60]))
else:
    print('Response:', str(d)[:300])
