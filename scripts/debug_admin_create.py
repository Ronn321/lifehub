import subprocess, json, os

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
d = json.loads(r.stdout)
t = d['accessToken']
print('Login OK, token len=' + str(len(t)) + ', roles=' + str(d['roles']))

# IMPORTANT: full header with "Authorization: " prefix
full_hdr = 'Authorization: Bearer ' + t

body = '{"email":"atest42@lifehub.local","password":"test12345","displayName":"A Test"}'
r2 = subprocess.run(['curl', '-s', '-w', '%{http_code}', '-o', '-',
    'http://localhost:3007/api/v1/users/admin-create', '-X', 'POST',
    '-H', 'Content-Type: application/json', '-H', full_hdr, '-d', body],
    capture_output=True, text=True)
# curl -w puts status code at end
out = r2.stdout
# status code is the last 3 chars
code = out[-3:] if len(out) >= 3 else '?'
body_resp = out[:-3] if len(out) > 3 else out
print('POST /users/admin-create -> HTTP ' + code + ' | ' + body_resp[:200])
