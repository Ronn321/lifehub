import json, subprocess

# Step 1: Login
r = subprocess.run([
    'curl', '-s', '-X', 'POST',
    'http://localhost:3007/api/v1/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'
], capture_output=True, text=True)
data = json.loads(r.stdout)
token = data.get('accessToken', '')

print(json.dumps(data, indent=2))
