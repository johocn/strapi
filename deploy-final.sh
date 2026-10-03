#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

echo "=== 1. git pull (plugin dist) ==="
git pull origin main 2>&1 | tail -5

echo ""
echo "=== 2. verify controller ctx in new dist ==="
grep -c 'async createSchedule(ctx)' plugins/zhao-studio/dist/server/index.js
grep -c 'async listSchedules(ctx)' plugins/zhao-studio/dist/server/index.js
grep -c 'async previewPublish(ctx)' plugins/zhao-studio/dist/server/index.js

echo ""
echo "=== 3. check admin build ==="
ls node_modules/@strapi/admin/dist/server/server/build/index.html 2>&1 || echo "MISSING admin build"

echo ""
echo "=== 4. try dev mode start (skip admin build check) ==="
pm2 delete strapi 2>/dev/null
# 先尝试 strapi start --no-build (production 模式跳过 admin build 检查)
NODE_OPTIONS="--max-old-space-size=256" pm2 start npm --name strapi -- run start 2>&1 | tail -5

echo ""
echo "=== 5. wait ==="
for i in $(seq 1 24); do
  sleep 5
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  echo "check $i: HTTP=$code"
  [ "$code" = "200" ] && break
done

echo ""
echo "=== 6. API TESTS ==="
echo "--- PLATFORMS ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms 2>&1 | head -c 400
echo ""
echo "--- SCHEDULES ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules 2>&1 | head -c 400
echo ""
echo "--- OAUTH AUTHORIZE ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/oauth/authorize/test 2>&1 | head -c 300
echo ""
echo "--- PREVIEW ---"
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/admin/publish/preview -H "Content-Type: application/json" -d '{"articleId":"test","accountIds":[]}' 2>&1 | head -c 400

echo ""
echo "=== 7. LOGS ==="
tail -30 /home/admin/.pm2/logs/strapi-out.log
