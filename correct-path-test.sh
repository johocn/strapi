#!/bin/bash
echo "===== 正确路径 API 全测 ====="

echo ""
echo "--- 1. PLATFORMS (GET v1/admin, 需要 auth) ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/platforms 2>&1 | head -c 300

echo ""
echo "--- 2. SCHEDULES (GET v1/admin) ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/schedules 2>&1 | head -c 300

echo ""
echo "--- 3. PREVIEW (POST v1/admin) ---"
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/v1/admin/publish/preview \
  -H "Content-Type: application/json" -d '{"articleId":"test","accountIds":[]}' 2>&1 | head -c 300

echo ""
echo "--- 4. OAUTH AUTHORIZE (GET v1/admin/oauth/authorize/:accountId) ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/oauth/authorize/test 2>&1 | head -c 300

echo ""
echo "--- 5. DOUBYIN SCHEMA (GET v1/admin/oauth/douyin-schema/:recordId) ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/oauth/douyin-schema/test123 2>&1 | head -c 300

echo ""
echo "--- 6. PUBLIC: articles (GET v1) ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/articles 2>&1 | head -c 300

echo ""
echo "--- 7. PUBLIC: categories ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/categories 2>&1 | head -c 300

echo ""
echo "--- 8. PUBLIC: channels ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/channels 2>&1 | head -c 300

echo ""
echo "=== pm2 status ==="
pm2 list strapi --no-color 2>/dev/null | tail -2
echo ""
echo "=== crash? ==="
tail -2 /home/admin/.pm2/logs/strapi-error.log 2>/dev/null
