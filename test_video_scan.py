import json, subprocess

pw = "admin12345"
r = subprocess.run(['curl', '-s', '-X', 'POST', 'http://localhost:3007/api/v1/auth/login', '-H', 'Content-Type: application/json', '-d', '{"email":"admin@lifehub.local","password":"%s"}' % pw], capture_output=True, text=True)
t = json.loads(r.stdout)["accessToken"]
print("Token OK")

auth = "Authorization: Bearer " + t
r = subprocess.run(['curl', '-s', '-X', 'POST', 'http://localhost:3007/api/v1/media/sources', '-H', 'Content-Type: application/json', '-H', auth, '-d', '{"name":"Videos Test","type":"windows_path","path":"C:\\Users\\Robert_D_AZ_1\\Downloads"}'], capture_output=True, text=True)
src = json.loads(r.stdout)
print("Source:", src.get("name", "?"), "ID:", src.get("id", "?")[:12])

sid = src["id"]
r2 = subprocess.run(['curl', '-s', '-X', 'POST', 'http://localhost:3007/api/v1/media/sources/' + sid + '/index', '-H', auth], capture_output=True, text=True)
print("Scan result:")
print(r2.stdout[:600])
