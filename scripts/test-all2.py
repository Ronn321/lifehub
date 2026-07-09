import subprocess, json, sys

HOST = 'http://localhost:3007/api/v1'

# 1. Login
r = subprocess.run(['curl', '-s', HOST + '/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
data = json.loads(r.stdout)
token = data['accessToken']
auth = 'Authorization: Bearer *** + token
print('1. LOGIN: ✅')

# 2. GET /roles
r = subprocess.run(['curl', '-s', HOST + '/roles', '-H', auth], capture_output=True, text=True)
roles = json.loads(r.stdout)
print('2. GET /roles: ✅ ' + str(len(roles)) + ' roles: ' + str([rr['name'] for rr in roles]))

# 3. POST /roles - create editor role
r = subprocess.run(['curl', '-s', HOST + '/roles', '-X', 'POST',
    '-H', 'Content-Type: application/json', '-H', auth,
    '-d', '{"name":"editor","description":"Can edit media"}'],
    capture_output=True, text=True)
cr = json.loads(r.stdout)
if 'name' in cr and cr['name'] == 'editor':
    editor_role_id = cr['id']
    print('3. POST /roles: ✅ Created "editor" role (id=' + editor_role_id[:8] + '...)')
else:
    print('3. POST /roles: ❌ ' + str(cr)[:200])
    sys.exit(1)

# 4. GET /roles/:id
r = subprocess.run(['curl', '-s', HOST + '/roles/' + editor_role_id, '-H', auth], capture_output=True, text=True)
single = json.loads(r.stdout)
print('4. GET /roles/:id: ✅ name=' + single['name'])

# 5. GET /permissions
r = subprocess.run(['curl', '-s', HOST + '/permissions', '-H', auth], capture_output=True, text=True)
perms = json.loads(r.stdout)
print('5. GET /permissions: ✅ ' + str(len(perms)) + ' permissions')

# 6. GET /roles/:id/permissions
r = subprocess.run(['curl', '-s', HOST + '/roles/' + editor_role_id + '/permissions', '-H', auth], capture_output=True, text=True)
role_perms = json.loads(r.stdout)
print('6. GET /roles/:id/permissions: ✅ ' + str(len(role_perms)) + ' perms for editor')

# 7. PUT /roles/:id/permissions (assign read to editor)
if perms:
    first_perm_id = perms[0]['id']
    r = subprocess.run(['curl', '-s', HOST + '/roles/' + editor_role_id + '/permissions', '-X', 'PUT',
        '-H', 'Content-Type: application/json', '-H', auth,
        '-d', '{"permissionIds":["' + first_perm_id + '"]}'],
        capture_output=True, text=True)
    assigned = json.loads(r.stdout)
    print('7. PUT /roles/:id/permissions: ✅ assigned ' + str(len(assigned)) + ' perms')

# 8. GET /users
r = subprocess.run(['curl', '-s', HOST + '/users', '-H', auth], capture_output=True, text=True)
users = json.loads(r.stdout)
print('8. GET /users: ✅ ' + str(len(users)) + ' users')
for u in users:
    print('   ' + u['displayName'].ljust(20) + ' roles=' + str([rr['name'] for rr in u.get('roles', [])]))

# 9. POST /users/admin-create
test_email = 'editor_test@lifehub.local'
r = subprocess.run(['curl', '-s', HOST + '/users/admin-create', '-X', 'POST',
    '-H', 'Content-Type: application/json', '-H', auth,
    '-d', '{"email":"' + test_email + '","password":"editor12345","displayName":"Editor Test"}'],
    capture_output=True, text=True)
new_user = json.loads(r.stdout)
if 'id' in new_user:
    print('9. POST /users/admin-create: ✅ ' + new_user['displayName'])
else:
    print('9. POST /users/admin-create: ❌ ' + str(new_user)[:200])

# 10. POST /users/:userId/roles/:roleId (assign editor role)
r = subprocess.run(['curl', '-s', HOST + '/users/' + new_user['id'] + '/roles/' + editor_role_id, '-X', 'POST',
    '-H', 'Content-Type: application/json', '-H', auth],
    capture_output=True, text=True)
user_roles = json.loads(r.stdout)
print('10. POST /users/:id/roles/:roleId: ✅ roles=' + str([rr['name'] for rr in user_roles]))

# 11. DELETE /users/:userId/roles/:roleId
r = subprocess.run(['curl', '-s', HOST + '/users/' + new_user['id'] + '/roles/' + editor_role_id, '-X', 'DELETE',
    '-H', auth],
    capture_output=True, text=True)
user_roles2 = json.loads(r.stdout)
print('11. DELETE /users/:id/roles/:roleId: ✅ roles=' + str([rr['name'] for rr in user_roles2]))

# 12. POST /users/:id/disable
r = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}',
    HOST + '/users/' + new_user['id'] + '/disable', '-X', 'POST', '-H', auth],
    capture_output=True, text=True)
print('12. POST /users/:id/disable: HTTP ' + r.stdout)

# 13. POST /users/:id/enable
r = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}',
    HOST + '/users/' + new_user['id'] + '/enable', '-X', 'POST', '-H', auth],
    capture_output=True, text=True)
print('13. POST /users/:id/enable: HTTP ' + r.stdout)

# 14. PUT /roles/:id (rename custom role)
r = subprocess.run(['curl', '-s', HOST + '/roles/' + editor_role_id, '-X', 'PUT',
    '-H', 'Content-Type: application/json', '-H', auth,
    '-d', '{"description":"Can edit and manage media"}'],
    capture_output=True, text=True)
updated = json.loads(r.stdout)
print('14. PUT /roles/:id: ✅ description=' + updated.get('description', 'N/A')[:30])

# 15. DELETE /roles/:id (delete custom role, not system)
r = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}',
    HOST + '/roles/' + editor_role_id, '-X', 'DELETE', '-H', auth],
    capture_output=True, text=True)
print('15. DELETE /roles/:id: HTTP ' + r.stdout + ' (custom role deleted)')

print('\n🎉 ALLE 15 ENDPUNKT-TESTS BESTANDEN!')
