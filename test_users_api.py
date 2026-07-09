import json, subprocess

r = subprocess.run(['curl', '-s', '-X', 'POST', 'http://localhost:3007/api/v1/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
data = json.loads(r.stdout)
tok = data['accessToken']
auth = 'Authorization: Bearer ' + tok

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/users', '-H', auth], capture_output=True, text=True)
out = r.stdout
print('Raw:', out[:500])
try:
    users = json.loads(out)
    print('Users count:', len(users))
    for u in users:
        roles = ', '.join([r.get('name','?') for r in u.get('roles',[])])
        print('  - ' + u['email'] + ' (active=' + str(u['isActive']) + ', roles=[' + roles + '])')
except Exception as e:
    print('Parse error:', e)
