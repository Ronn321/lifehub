import subprocess, json
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'], capture_output=True, text=True)
the_jwt_v = json.loads(r.stdout)['accessToken']
print('Token from login:', the_jwt_v[:30] + '...')
# Test stream endpoint
url_for_test = 'http://localhost:3007/api/v1/jellyfin/items/cab7d78c-ef1d-44c1-87ff-bac843372660/stream?token=' + the_jwt_v
r2 = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', url_for_test], capture_output=True, text=True)
print('Stream endpoint HTTP:', r2.stdout)
