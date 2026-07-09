import subprocess, json

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
access_token_val = json.loads(r.stdout)['accessToken']
full_hdr = 'Authorization: Bearer ' + access_token_val

r = subprocess.run(['curl', '-s', '-D', '-', '-o', '/dev/null', 'http://localhost:3007/api/v1/dashboard/layout', '-H', full_hdr],
    capture_output=True, text=True)
print(r.stdout[:800])
