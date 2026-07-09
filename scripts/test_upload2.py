import subprocess, json, os, tempfile

r = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/auth/login', '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@lifehub.local","password":"admin12345"}'],
    capture_output=True, text=True)
d = json.loads(r.stdout)
the_tok = d['accessToken']
print('Login OK')

tmp = tempfile.NamedTemporaryFile(suffix='.txt', delete=False, mode='w')
tmp.write('Test document content')
tmp.close()

hdr_val = 'Authorization: Bearer ' + the_tok
r2 = subprocess.run(['curl', '-s', 'http://localhost:3007/api/v1/documents', '-X', 'POST',
    '-H', hdr_val,
    '-F', 'file=@' + tmp.name,
    '-F', 'name=Test-Dokument'],
    capture_output=True, text=True)
os.unlink(tmp.name)
print('Upload response:', r2.stdout[:400])
print('HTTP status:', r2.returncode)
