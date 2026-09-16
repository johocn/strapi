#!/bin/bash
# 验证 admin(id=1, channel-admin) 渠道限制：站点列表应只含渠道2站点（圣麟口腔/锦润学域），不含 joho.cn
BASE="http://127.0.0.1:1337"

LOGIN=$(curl -s -X POST "$BASE/api/zhao-sso/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"type":"password","identifier":"admin","password":"__PASSWORD__","app_code":"course"}')
echo "LOGIN_RAW: $(echo "$LOGIN" | head -c 200)"
TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))')
if [ -z "$TOKEN" ]; then echo "FAIL login"; exit 1; fi
echo "OK login token_len=${#TOKEN}"

echo "--- admin 站点列表（应只含渠道2站点）---"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/zhao-common/v1/admin/config/sites" | python3 -c 'import sys,json; d=json.load(sys.stdin); print([s.get("siteName") for s in d.get("data",[])])'

echo "--- admin permission-keys 关键项 ---"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/zhao-auth/v1/my/permission-keys" | python3 -c 'import sys,json; p=json.load(sys.stdin).get("permissions",[]); print("menu.point-center:", "menu.point-center" in p, "| menu.website-center:", "menu.website-center" in p, "| quiz.read:", "quiz.read" in p)'

echo "--- admin quizzes 接口（带 x-site-id=圣麟口腔 drxb4lxprzdoyj6tj667wpvb）---"
curl -s -o /dev/null -w "HTTP:%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-site-id: drxb4lxprzdoyj6tj667wpvb" \
  "$BASE/api/zhao-quiz/v1/admin/quizzes?pagination[pageSize]=2"
