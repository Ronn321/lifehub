import subprocess, json

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
access_token_str = json.loads(r.stdout)['accessToken']
prefix = 'Authorization: Bearer '
auth_full = prefix + access_token_str

# Get all files, count by mime type
r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/media/files?limit=500', '-H', auth_full], capture_output=True, text=True)
files = json.loads(r.stdout)
print('Total files: ' + str(len(files)))

video_count = 0
for f in files:
    if f['mimeType'] and f['mimeType'].startswith('video/'):
        video_count += 1
        print('  VID: ' + f['filename'] + ' | type: ' + f['mimeType'] + ' | thumb: ' + ('yes' if f.get('thumbnailPath') else 'no'))
print('Video files: ' + str(video_count))

# Show non-video count
image_count = sum(1 for f in files if f['mimeType'] and f['mimeType'].startswith('image/'))
other_count = len(files) - image_count - video_count
print('Image files: ' + str(image_count))
print('Other files: ' + str(other_count))
