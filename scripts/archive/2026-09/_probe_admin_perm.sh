#!/bin/bash
# 验证 admin 用户登录 + 权限
set -e
LOGIN=$(curl -s -X POST 'http://127.0.0.1:1337/api/zhao-auth/v1/admin/auth/local' \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"admin","password":"__PASSWORD__"}')
echo "LOGIN: $(echo "$LOGIN" | head -c 200)"
TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("jwt") or (d.get("data") or {}).get("jwt") or "")')
echo "TOKEN len: ${#TOKEN}"
if [ -z "$TOKEN" ]; then
  echo "LOGIN FAILED"; exit 1
fi
echo "===== /my/permission-keys ====="
curl -s 'http://127.0.0.1:1337/api/zhao-auth/v1/my/permission-keys' \
  -H "Authorization: Bearer $TOKEN" | python3 -c '
import sys, json
d = json.load(sys.stdin)
d = d.get("data", d)
perms = d.get("permissions", []) if isinstance(d, dict) else d
keys = [k for k in perms if "center" in k or k.startswith("menu.")]
print("permission count:", len(perms))
print("center/menu keys:", keys)
'
