#!/bin/bash
# 查 zhao(id=2) 的 zhao_roles 与 users-permissions roles 关联，定位 admin 识别失效
# 用法：scp 到 joho 后 bash /tmp/_diag_quiz_403.sh
set -e
BASE="http://127.0.0.1:1337"

LOGIN=$(curl -s -X POST "$BASE/api/zhao-sso/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"type":"password","identifier":"zhao","password":"__PASSWORD__","app_code":"course"}')
TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))')
if [ -z "$TOKEN" ]; then echo "FAIL login"; exit 1; fi
echo "OK login token_len=${#TOKEN}"

echo "--- zhao 权限键（正确路径 /v1/my/permission-keys）---"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/zhao-auth/v1/my/permission-keys" | head -c 1500
echo ""

echo "--- zhao my/permissions ---"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/zhao-auth/v1/my/permissions" | head -c 1500
echo ""

echo "--- 站点列表 ---"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/zhao-common/v1/admin/config/sites" | head -c 800
echo ""

echo "--- DB: zhao up_users roles/zhao_roles ---"
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -c "
SELECT u.id, u.username,
       u.zhao_roles,
       (SELECT array_agg(r.type) FROM up_roles r
        JOIN users_permissions_user_roles ur ON ur.role_id = r.id
        WHERE ur.user_id = u.id) AS up_roles
FROM up_users u WHERE u.username IN ('zhao','admin','Zhao');
"
