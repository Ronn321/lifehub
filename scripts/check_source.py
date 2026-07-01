import subprocess, json, os

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
token_val = json.loads(r.stdout)['accessToken']
auth_hdr = 'Authorization: Bearer '
auth_hdr = auth_hdr + token_val

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/media/sources', '-H', auth_hdr], capture_output=True, text=True)
sources = json.loads(r.stdout)
for src in sources:
    print('Source: ' + src['name'] + ' | path: ' + src['path'] + ' | active: ' + str(src['isActive']))

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/media/files?limit=1', '-H', auth_hdr], capture_output=True, text=True)
files = json.loads(r.stdout)
if files:
    f = files[0]
    print('\nFile: ' + f['filename'])
    print('mimeType: ' + f['mimeType'])
    for src in sources:
        if src['id'] == f['sourceId']:
            full_path = src['path'] + '/' + f['relativePath']
            print('Full path: ' + full_path)
            print('Exists on disk: ' + str(os.path.exists(full_path)))
            break
