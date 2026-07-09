import subprocess, json

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
access_token = json.loads(r.stdout)['accessToken']
bearer = 'Authorization: Bearer *** 
auth_hdr = bearer + access_token

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/dashboard/layout', '-H', auth_hdr],
    capture_output=True, text=True)
print('GET /dashboard/layout:')
print(r.stdout[:400])

r2 = subprocess.run(['curl', '-s', '-w', '|%{http_code}', 'http://localhost:3007/api/v1/dashboard/layout',
    '-X', 'PUT', '-H', 'Content-Type: application/json', '-H', auth_hdr,
    '-d', '{"widgets":[{"id":"w1","type":"media","x":0,"y":0,"w":2,"h":2}]}'],
    capture_output=True, text=True)
code = r2.stdout.split('|')[1] if '|' in r2.stdout else '?'
print('\nPUT /dashboard/layout -> HTTP ' + code)
