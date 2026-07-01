import subprocess, json, os

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
token_val = json.loads(r.stdout)['accessToken']
bearer_prefix = 'Authorization: Bearer '
auth_hdr_val = bearer_prefix + token_val

# Get first video file
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/media/files?limit=100', '-H', auth_hdr_val], capture_output=True, text=True)
files = json.loads(r.stdout)
videos = [f for f in files if f['mimeType'] and f['mimeType'].startswith('video/')]
if not videos:
    print('No videos')
    exit()

v = videos[0]
print('File: ' + v['filename'])
print('sourceId: ' + v['sourceId'])
print('relativePath: ' + v['relativePath'])

# Get source path
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/media/sources', '-H', auth_hdr_val], capture_output=True, text=True)
sources = json.loads(r.stdout)
for s in sources:
    if s['id'] == v['sourceId']:
        full = s['path'] + '/' + v['relativePath']
        print('Full path: ' + full)
        print('Exists: ' + str(os.path.exists(full)))
        if os.path.exists(full):
            print('Size: ' + str(os.path.getsize(full)))
            # Try streaming the video file
            stream_url = 'http://localhost:3007/api/v1/media/files/' + v['id'] + '/stream?token=' + token_val
            r2 = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', stream_url], capture_output=True, text=True)
            print('Stream HTTP: ' + r2.stdout)
        break
