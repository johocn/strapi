#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

echo "=== 1. git pull ==="
git pull 2>&1 | tail -5

echo ""
echo "=== 2. 停 strapi 释放内存 ==="
pm2 stop strapi 2>/dev/null || true
sleep 3
free -m

echo ""
echo "=== 3. plugin build (轻量) ==="
cd plugins/zhao-studio
NODE_OPTIONS="--max-old-space-size=512" timeout 120 npx strapi-plugin build 2>&1 | tail -15
echo "exit=$?"

echo ""
echo "=== 4. 验证 plugin dist ==="
ls -la dist/server/index.js 2>&1
echo ""
# grep 我们加的 getCleanRedisConfig
grep -c "getCleanRedisConfig" dist/server/index.js 2>&1 || echo "not found"

echo ""
echo "=== 5. 回根目录 + start ==="
cd /www/apps/strapi
pm2 delete strapi 2>/dev/null
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -3

echo ""
echo "=== 6. wait ==="
for i in $(seq 1 30); do
  sleep 4
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  echo "check $i: HTTP=$code"
  [ "$code" = "200" ] && break
done
