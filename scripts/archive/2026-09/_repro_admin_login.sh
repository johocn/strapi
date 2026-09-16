#!/bin/bash
# 复现 admin 登录后台流程：local 登录 → roles/permissions/tenants → config 模块授权
BASE="http://127.0.0.1:1337"

try_login() {
  local id="$1" pw="$2"
  curl -s -X POST "$BASE/api/zhao-auth/v1/admin/auth/local" \
    -H 'Content-Type: application/json' \
    -d "{\"identifier\":\"$id\",\"password\":\"$pw\"}"
}

LOGIN=$(try_login "admin" "__PASSWORD__")
echo "LOGIN(__PASSWORD__): $(echo "$LOGIN" | head -c 150)"
if ! echo "$LOGIN" | grep -q 'access_token\|jwt'; then
  LOGIN=$(try_login "admin" "__ADMIN_PASSWORD__")
  echo "LOGIN(__ADMIN_PASSWORD__): $(echo "$LOGIN" | head -c 150)"
fi
if ! echo "$LOGIN" | grep -q 'access_token\|jwt'; then
  echo "FAIL: 两种密码均失败"
  exit 1
fi

TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("access_token") or d.get("jwt") or "")')
echo "TOKEN_LEN=${#TOKEN}"

echo "=== my/roles ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/zhao-auth/v1/my/roles" | head -c 400; echo ""
echo "=== my/permission-keys (前 500) ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/zhao-auth/v1/my/permission-keys" | python3 -c 'import sys,json;p=json.load(sys.stdin).get("permissions",[]);print("count:",len(p));print("menu.point-center:", "menu.point-center" in p);print("menu.website-center:", "menu.website-center" in p);print("menu.website-seo:", "menu.website-seo" in p)' 2>/dev/null || echo "parse-fail"
echo "=== my/tenants ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/zhao-auth/v1/my/tenants" | python3 -c 'import sys,json;d=json.load(sys.stdin);d=d.get("data",d);print([(t.get("siteName") or t.get("name"), t.get("documentId")) for t in (d if isinstance(d,list) else d.get("list",[]))])' 2>/dev/null | head -c 500; echo ""
