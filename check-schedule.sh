#!/bin/bash
cd /www/apps/strapi

echo "=== 1. publish-schedule schema 是否在 dist ==="
ls plugins/zhao-studio/dist/server/src/content-types/ 2>/dev/null | grep schedule
grep -c "publish-schedule" plugins/zhao-studio/dist/server/index.js

echo ""
echo "=== 2. 源 schema ==="
cat plugins/zhao-studio/server/src/content-types/publish-schedule/schema.json 2>/dev/null | head -30

echo ""
echo "=== 3. 数据库表是否存在 ==="
export PGPASSWORD='Joho@963963'
psql -h 127.0.0.1 -U strapi -d strapi -c "\dt" 2>/dev/null | grep -i schedule || echo "NO SCHEDULE TABLE"

echo ""
echo "=== 4. Strapi 启动日志里有没有 publish-schedule ==="
grep -i "schedule" /home/admin/.pm2/logs/strapi-out.log | head -5

echo ""
echo "=== 5. 已有的 content-types (查一下有啥) ==="
psql -h 127.0.0.1 -U strapi -d strapi -c "\dt" 2>/dev/null | head -30
