#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

echo "=== 1. git pull ==="
git pull 2>&1 | tail -3

echo ""
echo "=== 2. stop strapi ==="
pm2 stop strapi 2>/dev/null; pm2 delete strapi 2>/dev/null; sleep 2

echo ""
echo "=== 3. plugin build ==="
cd plugins/zhao-studio
NODE_OPTIONS="--max-old-space-size=512" timeout 180 ../../node_modules/.bin/strapi-plugin build 2>&1 | tail -10
echo "exit=$?"
cd /www/apps/strapi

echo ""
echo "=== 4. verify ==="
ls -la plugins/zhao-studio/dist/server/index.js
grep -c "return { publish: null" plugins/zhao-studio/dist/server/index.js || echo "NOT FOUND"

echo ""
echo "=== 5. start ==="
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -2

echo ""
echo "=== 6. wait ==="
for i in $(seq 1 40); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "check $i: HTTP=200 OK!"
    break
  fi
  if [ $((i % 5)) -eq 0 ]; then
    echo "check $i: HTTP=$code"
  fi
done

echo ""
echo "=== PLATFORMS ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms 2>&1
echo ""
echo "=== SCHEDULES ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules 2>&1
echo ""
echo "=== PREVIEW ==="
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/admin/publish/preview -H "Content-Type: application/json" -d '{"articleId":"test","accountIds":[]}' 2>&1
echo ""
echo "=== OAUTH AUTHORIZE ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/oauth/authorize/test 2>&1
echo ""
echo "=== DOUBYIN SCHEMA ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/oauth/douyin-schema/test123 2>&1

echo ""
echo "=== CRASH LOG ==="
tail -5 /home/admin/.pm2/logs/strapi-error.log
