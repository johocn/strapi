#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

echo "=== 1. 清理所有 strapi 相关进程 ==="
pm2 delete strapi 2>/dev/null
pkill -f "strapi" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "strapi-develop" 2>/dev/null
sleep 3

echo ""
echo "=== 2. RAM 状态 ==="
free -m

echo ""
echo "=== 3. 用 STRAPI_SKIP_ADMIN_BUILD 跳过 admin build（服务器不需要 admin panel build，已经有 dist/build 了吗？） ==="
ls dist/build/index.html 2>&1 || echo "NO dist/build"
ls dist/server/index.js 2>&1 || echo "NO dist/server"

echo ""
echo "=== 4. 如果没 admin build，看看 strapi start 能不能跳过 admin check ==="
# 查 config/server.js 或 env
cat config/server.js 2>/dev/null || echo "no config/server.js"
echo "ADMIN_PATH=$ADMIN_PATH"

echo ""
echo "=== 5. 尝试直接 strapi start --no-build ==="
NODE_OPTIONS="--max-old-space-size=384" pm2 start npm --name strapi -- run start 2>&1 | tail -5

echo ""
echo "=== 6. WAIT ==="
for i in $(seq 1 20); do
  sleep 4
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  echo "check $i: HTTP=$code"
  [ "$code" = "200" ] && break
done

echo ""
echo "=== 7. TEST APIs ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms 2>&1 | head -c 500
echo ""
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules 2>&1 | head -c 500
echo ""
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/admin/publish/preview -H "Content-Type: application/json" -d '{"articleId":"test","accountIds":[]}' 2>&1 | head -c 500
echo ""
curl -s http://127.0.0.1:1337/api/zhao-studio/oauth/authorize/test 2>&1 | head -c 300
echo ""

echo ""
echo "=== 8. LOGS ==="
tail -30 /home/admin/.pm2/logs/strapi-out.log
tail -10 /home/admin/.pm2/logs/strapi-error.log
