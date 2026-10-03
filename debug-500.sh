#!/bin/bash
cd /www/apps/strapi

# 用刚才拿到的 token 重测 500 接口，同时拉错误日志
LOGIN=$(curl -s -X POST http://127.0.0.1:1337/api/auth/local -H "Content-Type: application/json" -d '{"identifier":"zhao","password":"a963963"}')
JWT=$(echo "$LOGIN" | grep -o '"jwt":"[^"]*"' | cut -d'"' -f4)
AUTH="Authorization: Bearer $JWT"

echo "=== PREVIEW 500 详情 ==="
curl -sv -X POST http://127.0.0.1:1337/api/zhao-studio/v1/admin/publish/preview \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"articleId":"test","accountIds":[]}' 2>&1 | tail -20

echo ""
echo "=== SCHEDULES 500 详情 ==="
curl -sv http://127.0.0.1:1337/api/zhao-studio/v1/admin/schedules -H "$AUTH" 2>&1 | tail -20

echo ""
echo "=== DOUBYIN-SCHEMA 500 详情 ==="
curl -sv http://127.0.0.1:1337/api/zhao-studio/v1/admin/oauth/douyin-schema/test123 -H "$AUTH" 2>&1 | tail -20

echo ""
echo "=== RECENT ERR ==="
tail -20 /home/admin/.pm2/logs/strapi-error.log

echo ""
echo "=== RECENT OUT (last 10s) ==="
tail -30 /home/admin/.pm2/logs/strapi-out.log | grep -i "error\|warn\|fail\|500"
