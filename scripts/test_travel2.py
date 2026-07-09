import subprocess, json
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
access_token_val = json.loads(r.stdout)['accessToken']
final_hdr = 'Authorization: Bearer ' + access_token_val

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/trips', '-H', final_hdr], capture_output=True, text=True)
print('GET /trips:', r.stdout[:400])

body = '{"title":"Italien 2025","startDate":"2025-06-01","endDate":"2025-06-15"}'
r2 = subprocess.run(['curl', '-s', '-w', '|CODE:%{http_code}', 'http://localhost:3007/api/v1/trips', '-X', 'POST',
    '-H', 'Content-Type: application/json', '-H', final_hdr, '-d', body], capture_output=True, text=True)
if '|CODE:' in r2.stdout:
    parts = r2.stdout.split('|CODE:')
    print('POST /trips -> HTTP', parts[-1], '|', parts[0][:300])
else:
    print('POST /trips ->', r2.stdout[:400])
