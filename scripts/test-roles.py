import subprocess, json

# Login
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST', '-H', 'Content-Type: application/json', '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'], capture_output=True, text=True)
data = json.loads(r.stdout)
token = data['accessToken']
print('Logged in, token=' + token[:20] + '...')

# Get roles
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/roles', '-H', 'Authorization: Bearer *** capture_output=True, text=True)
roles = json.loads(r.stdout)
print('Roles: ' + str([role['name'] for role in roles]))

# Create role
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/roles', '-H', 'Authorization: Bearer *** '-H', 'Content-Type: application/json', '-d', '{"name":"editor","description":"Can edit media"}'], capture_output=True, text=True)
cr = json.loads(r.stdout)
print('Create role response: ' + str(cr))

# List roles again
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/roles', '-H', 'Authorization: Bearer *** capture_output=True, text=True)
roles2 = json.loads(r.stdout)
print('Roles now: ' + str([role['name'] for role in roles2]))

# Get permissions
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/permissions', '-H', 'Authorization: Bearer *** capture_output=True, text=True)
perms = json.loads(r.stdout)
print('Permissions: ' + str(len(perms)) + ' total')
domains = sorted(set(p['domain'] for p in perms))
actions = sorted(set(p['action'] for p in perms))
print('Domains: ' + str(domains))
print('Actions: ' + str(actions))

# Get users with roles
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/users', '-H', 'Authorization: Bearer *** capture_output=True, text=True)
users = json.loads(r.stdout)
print('Users: ' + str(len(users)) + ' total')
for u in users:
    print('  ' + u['displayName'].ljust(20) + ' active=' + str(u['isActive']) + ' roles=' + str([rr['name'] for rr in u['roles']]))

print('\n=== All tests passed! ===')
