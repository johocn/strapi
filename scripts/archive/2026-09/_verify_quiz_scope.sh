#!/bin/bash
# 验证 zhao-quiz 渠道范围过滤修复（jsonb @> 查询）——部署后自检
# 用法：scp 到 joho 后 bash /tmp/_verify_quiz_scope.sh
set -e
BASE="http://127.0.0.1:1337"

LOGIN=$(curl -s -X POST "$BASE/api/zhao-sso/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"type":"password","identifier":"zhao","password":"__PASSWORD__","app_code":"course"}')
echo "LOGIN_RAW: $(echo "$LOGIN" | head -c 300)"

TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))')

if [ -z "$TOKEN" ]; then
  echo "FAIL: 登录失败"
  exit 1
fi
echo "OK: 登录成功, token_len=${#TOKEN}"

echo "--- 1. zhao(admin) 列表接口（不带 x-site-id）---"
curl -s -o /tmp/q1.body -w "HTTP:%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/zhao-quiz/v1/admin/quizzes?pagination[pageSize]=2"
head -c 300 /tmp/q1.body; echo ""

echo "--- 2. zhao(admin) 列表接口（带 x-site-id）---"
curl -s -o /tmp/q2.body -w "HTTP:%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-site-id: __dummy__" \
  "$BASE/api/zhao-quiz/v1/admin/quizzes?pagination[pageSize]=2"
head -c 300 /tmp/q2.body; echo ""

echo "--- 3. 无 token（预期 401）---"
curl -s -o /dev/null -w "HTTP:%{http_code}\n" \
  "$BASE/api/zhao-quiz/v1/admin/quizzes"
