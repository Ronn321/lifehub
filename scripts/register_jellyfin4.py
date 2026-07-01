import subprocess, json
x = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
login_data = json.loads(x.stdout)
access_token_str = login_data['accessToken']
s1 = 'Authorization: Bearer '
bearer_hdr = s1 + access_token_str
print('Login OK')
server_url = 'http://192.168.31.35:8096'
new_key = '0fde01a7adda4a40a3281c1cd3af1c5d'
r2 = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/jellyfin/servers', '-X', 'POST',
    '-H', 'Content-Type: application/json', '-H', bearer_hdr,
    '-d', '{"url":"' + server_url + '","apiKey":"' + new_key + '"}'],
    capture_output=True, text=True)
print('Register:', r2.stdout[:300])
try:
    server_data = json.loads(r2.stdout)
    sid = server_data.get('id', '')
except:
    sid = ''
if sid:
    print('Server ID:', sid)
    r3 = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/jellyfin/servers/' + sid + '/sync', '-X', 'POST',
        '-H', bearer_hdr], capture_output=True, text=True)
    print('Sync:', r3.stdout[:500])
    r4 = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/jellyfin/libraries',
        '-H', bearer_hdr], capture_output=True, text=True)
    print('Libraries:', r4.stdout[:500])
