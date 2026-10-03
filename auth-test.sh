#!/bin/bash
cd /www/apps/strapi

echo "=== 1. 登录拿 JWT ==="
LOGIN=$(curl -s -X POST http://127.0.0.1:1337/api/auth/local \
  -H "Content-Type: application/json" \
  -d '{"identifier":"zhao","password":"a963963"}')
echo "$LOGIN" | head -c 300
JWT=$(echo "$LOGIN" | grep -o '"jwt":"[^"]*"' | cut -d'"' -f4)
echo ""
echo "JWT: ${JWT:0:30}..."

if [ -z "$JWT" ]; then
  echo "LOGIN FAILED!"
  exit 1
fi

AUTH="Authorization: Bearer $JWT"

echo ""
echo "===== AUTHENTICATED API 全测 ====="

echo ""
echo "--- 1. PLATFORMS (GET) ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/platforms -H "$AUTH" 2>&1 | head -c 500

echo ""
echo "--- 2. SCHEDULES (GET) ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/schedules -H "$AUTH" 2>&1 | head -c 500

echo ""
echo "--- 3. PREVIEW (POST) ---"
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/v1/admin/publish/preview \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"articleId":"test","accountIds":[]}' 2>&1 | head -c 500

echo ""
echo "--- 4. OAUTH AUTHORIZE (GET) ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/oauth/authorize/test -H "$AUTH" 2>&1 | head -c 500

echo ""
echo "--- 5. DOUBYIN SCHEMA (GET) ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/oauth/douyin-schema/test123 -H "$AUTH" 2>&1 | head -c 500

echo ""
echo "--- 6. ACCOUNTS (GET) ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/accounts -H "$AUTH" 2>&1 | head -c 500

echo ""
echo "--- 7. RECORDS (GET) ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/records -H "$AUTH" 2>&1 | head -c 500

echo ""
echo "--- 8. AI CONFIG (GET) ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/ai/config -H "$AUTH" 2>&1 | head -c 500

echo ""
echo "--- 9. PUBLIC: articles ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/articles 2>&1 | head -c 300

echo ""
echo "--- 10. PUPLIC: ad zones ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/ads/zones/course-home-banner 2>&1 | head -c 300

echo ""
echo "===== CRASH CHECK ====="
tail -3 /home/admin/.pm2/logs/strapi-error.log 2>/dev/null
echo "--- pm2 ---"
pm2 list strapi --no-color 2>/dev/null | tail -2
