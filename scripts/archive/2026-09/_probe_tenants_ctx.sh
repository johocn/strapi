#!/bin/bash
TOKEN=$(cat /tmp/_admin_token.txt)
echo "===== /my/tenants 带 x-site-id=drxb4lxprzdoyj6tj667wpvb ====="
curl -s 'http://127.0.0.1:1337/api/zhao-auth/v1/my/tenants' \
  -H "Authorization: Bearer $TOKEN" -H "x-site-id: drxb4lxprzdoyj6tj667wpvb" | python3 -c '
import sys, json
d = json.load(sys.stdin)
data = d.get("data", [])
print("count:", len(data))
for t in data:
    print(" ", t.get("id"), t.get("documentId"), t.get("siteName"), t.get("domain"))
'
echo ""
echo "===== /my/tenants 无 x-site-id ====="
curl -s 'http://127.0.0.1:1337/api/zhao-auth/v1/my/tenants' \
  -H "Authorization: Bearer $TOKEN" | python3 -c '
import sys, json
d = json.load(sys.stdin)
data = d.get("data", [])
print("count:", len(data))
for t in data:
    print(" ", t.get("id"), t.get("documentId"), t.get("siteName"), t.get("domain"))
'
echo ""
echo "===== /my/channel-scope 带 x-site-id ====="
curl -s 'http://127.0.0.1:1337/api/zhao-auth/v1/my/channel-scope' \
  -H "Authorization: Bearer $TOKEN" -H "x-site-id: drxb4lxprzdoyj6tj667wpvb"
echo ""
