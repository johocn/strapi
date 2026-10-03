#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

# 后台跑 build，写日志到 /tmp/build.log
cd /www/apps/strapi
NODE_OPTIONS="--max-old-space-size=1536" nohup npm run build > /tmp/build.log 2>&1 &
BUILD_PID=$!
echo "BUILD PID=$BUILD_PID"

# 等 build 完成（最多 10 分钟）
for i in $(seq 1 60); do
  sleep 10
  if ! kill -0 $BUILD_PID 2>/dev/null; then
    echo "BUILD DONE after ${i}0s"
    break
  fi
  echo "still building... ${i}0s"
done

echo ""
echo "=== BUILD LOG TAIL ==="
tail -20 /tmp/build.log

echo ""
echo "=== VERIFY ==="
ls -la node_modules/@strapi/admin/dist/server/server/build/index.html 2>&1
echo ""
ls -la dist/build/index.html 2>&1

echo ""
echo "=== RESTART ==="
pm2 restart strapi --update-env 2>&1 | tail -3

echo ""
echo "=== WAIT ==="
for i in $(seq 1 30); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  echo "check $i: HTTP=$code"
  [ "$code" = "200" ] && break
done

echo ""
echo "=== TEST APIs ==="
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

echo ""
echo "=== LOGS ==="
tail -30 /home/admin/.pm2/logs/strapi-out.log
