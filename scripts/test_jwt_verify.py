import subprocess, json
# Login and get token
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'], capture_output=True, text=True)
jwt_token = json.loads(r.stdout)['accessToken']

# Try the stream endpoint with the REAL token
url = 'http://localhost:3007/api/v1/jellyfin/items/cab7d78c-ef1d-44c1-87ff-bac843372660/stream?token=' + jwt_token
r2 = subprocess.run(['curl', '-s', '-D', '-', '-o', '/dev/null', url], capture_output=True, text=True, timeout=10)
print('Headers:', r2.stdout[:200])
# Check status
print('Full response:', r2.stdout)
