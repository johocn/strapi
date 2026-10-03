#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

# === 方案 A: 用根 node_modules 里的 strapi-plugin ===
echo "=== 找 strapi-plugin binary ==="
find node_modules -name "strapi-plugin" -type f 2>/dev/null | head -3

echo ""
echo "=== 用根目录 npx strapi-plugin ==="
cd plugins/zhao-studio
NODE_OPTIONS="--max-old-space-size=512" timeout 180 ../../node_modules/.bin/strapi-plugin build 2>&1 | tail -15
echo "exit=$?"

echo ""
echo "=== 验证 ==="
ls -la dist/server/index.js
grep -c "getCleanRedisConfig" dist/server/index.js || echo "NOT FOUND - build failed"

# 如果还是不行，手动 patch dist：把 initStudioQueues 开头加 try-catch
echo ""
echo "=== 手动 patch (fallback) ==="
cd /www/apps/strapi

echo ""
echo "=== restart ==="
pm2 delete strapi 2>/dev/null
pm2 stop vendure-worker 2>/dev/null
sleep 2
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -3

echo ""
echo "=== wait ==="
for i in $(seq 1 30); do
  sleep 4
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  echo "check $i: HTTP=$code"
  [ "$code" = "200" ] && break
done

echo ""
echo "=== APIs ==="
echo "--- PLATFORMS ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms 2>&1 | head -c 500
echo ""
echo "--- SCHEDULES ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules 2>&1 | head -c 500
echo ""
echo "--- PREVIEW ---"
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/admin/publish/preview -H "Content-Type: application/json" -d '{"articleId":"test","accountIds":[]}' 2>&1 | head -c 500
echo ""
echo "--- OAUTH ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/oauth/authorize/test 2>&1 | head -c 300

echo ""
echo "=== LOGS TAIL ==="
tail -20 /home/admin/.pm2/logs/strapi-out.log
echo "--- ERR ---"
tail -10 /home/admin/.pm2/logs/strapi-error.log
