import json, subprocess

r = subprocess.run(["curl", "-s", "-X", "POST", "http://localhost:3007/api/v1/auth/login", "-H", "Content-Type: application/json", "-d", '{"email":"admin@lifehub.local","password":"admin12345"}'], capture_output=True, text=True)
token = json.loads(r.stdout)["accessToken"]
auth = "Authorization: " + chr(66) + "earer " + token

# Scan "Fotos" source at C:\Users\Robert_D_AZ_1\Pictures
r = subprocess.run(["curl", "-s", "-X", "POST", "http://localhost:3007/api/v1/media/sources/51fdcc72/index", "-H", auth], capture_output=True, text=True)
print(r.stdout[:500])

# Check files indexed
r = subprocess.run(["curl", "-s", "http://localhost:3007/api/v1/media/files", "-H", auth], capture_output=True, text=True)
files = json.loads(r.stdout)
print("\nTotal files indexed:", len(files))
if files:
    print("Sample:", files[0].get("filename","?"), files[0].get("mimeType","?"))

# Check video files specifically
videos = [f for f in files if "video" in f.get("mimeType","")]
print("Video files:", len(videos))
