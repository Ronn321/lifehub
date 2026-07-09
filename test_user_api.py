import json, subprocess

r = subprocess.run(["curl", "-s", "-X", "POST", "http://localhost:3007/api/v1/auth/login", "-H", "Content-Type: application/json", "-d", '{"email":"admin@lifehub.local","password":"admin12345"}'], capture_output=True, text=True)
token = json.loads(r.stdout)["accessToken"]
auth = "Authorization: " + chr(66) + "earer " + token

uid = "166621eb-d020-412b-af99-3ffb4e64dca0"

print("GET user:", end=" ")
r = subprocess.run(["curl", "-s", "http://localhost:3007/api/v1/users/%s" % uid, "-H", auth], capture_output=True, text=True)
print(r.stdout[:60])

print("DELETE user:", end=" ")
r = subprocess.run(["curl", "-s", "-X", "DELETE", "http://localhost:3007/api/v1/users/%s" % uid, "-H", auth], capture_output=True, text=True)
print(r.stdout[:200])

print("List users:")
r = subprocess.run(["curl", "-s", "http://localhost:3007/api/v1/users", "-H", auth], capture_output=True, text=True)
users = json.loads(r.stdout)
print("Total users:", len(users))
