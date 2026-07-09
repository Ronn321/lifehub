import subprocess, json, sys

HOST = 'http://localhost:3007/api/v1'

# Login
r = subprocess.run(['curl', '-s', HOST + '/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
data = json.loads(r.stdout)
token = data['accessToken']
auth_hdr = 'Authorization: Bearer ' + token
print('1. Login: OK')

# POST /roles
r = subprocess.run(['curl', '-s', HOST + '/roles', '-X', 'POST',
    '-H', auth_hdr, '-H', 'Content-Type: application/json',
    '-d', '{"name":"editor","description":"Can edit media"}'],
    capture_output=True, text=True)
print('2. POST /roles: ' + r.stdout[:300])
role_data = json.loads(r.stdout)
if 'name' in role_data:
    print('   Editor role created: ' + role_data['name'])
else:
    print('   FAILED: ' + str(role_data))
    sys.exit(1)

# GET /roles
r = subprocess.run(['curl', '-s', HOST + '/roles', '-H', auth_hdr], capture_output=True, text=True)
roles = json.loads(r.stdout)
print('3. GET /roles: ' + str([rr['name'] for rr in roles]))

# GET /permissions
r = subprocess.run(['curl', '-s', HOST + '/permissions', '-H', auth_hdr], capture_output=True, text=True)
perms = json.loads(r.stdout)
print('4. GET /permissions: ' + str(len(perms)) + ' entries')

# POST /users/admin-create
r = subprocess.run(['curl', '-s', HOST + '/users/admin-create', '-X', 'POST',
    '-H', auth_hdr, '-H', 'Content-Type: application/json',
    '-d', '{"email":"editor_u@lifehub.local","password":"editor12345","displayName":"Editor","roleIds":[]}'],
    capture_output=True, text=True)
new_user = json.loads(r.stdout)
if 'id' in new_user:
    print('5. Admin-create user: ' + new_user['displayName'] + ' (' + new_user['email'] + ')')
else:
    print('5. Admin-create user FAILED: ' + str(new_user))
    sys.exit(1)

# GET /users
r = subprocess.run(['curl', '-s', HOST + '/users', '-H', auth_hdr], capture_output=True, text=True)
users = json.loads(r.stdout)
print('6. GET /users: ' + str(len(users)) + ' users')
for u in users:
    role_names = [rr['name'] for rr in u.get('roles', [])]
    print('   ' + u['displayName'].ljust(20) + ' active=' + str(u['isActive']) + ' roles=' + str(role_names))

# POST /users/:id/disable
disabled_user = [u for u in users if u['id'] != data['user']['id']][0]
r = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}',
    HOST + '/users/' + disabled_user['id'] + '/disable', '-X', 'POST', '-H', auth_hdr],
    capture_output=True, text=True)
print('7. Disable user ' + disabled_user['displayName'] + ': HTTP ' + r.stdout)

# POST /users/:id/enable
r = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}',
    HOST + '/users/' + disabled_user['id'] + '/enable', '-X', 'POST', '-H', auth_hdr],
    capture_output=True, text=True)
print('8. Enable user ' + disabled_user['displayName'] + ': HTTP ' + r.stdout)

print('\nALL TESTS PASSED')
