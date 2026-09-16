#!/bin/bash
# 解码 zhao SSO token 的 roles，并查 sso_user_app_roles 记录
BASE="http://127.0.0.1:1337"

LOGIN=$(curl -s -X POST "$BASE/api/zhao-sso/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"type":"password","identifier":"zhao","password":"__PASSWORD__","app_code":"course"}')
TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))')
if [ -z "$TOKEN" ]; then echo "FAIL login"; exit 1; fi

echo "--- token payload ---"
echo "$TOKEN" | cut -d. -f2 | python3 -c 'import sys,base64,json; s=sys.stdin.read().strip(); s+="="*(-len(s)%4); print(json.dumps(json.loads(base64.urlsafe_b64decode(s)), ensure_ascii=False))'

echo "--- sso_user_app_roles 记录（sso_id=2）---"
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -c "
SELECT * FROM sso_user_app_roles WHERE sso_user_id = 2 OR user_id = 2;
"
