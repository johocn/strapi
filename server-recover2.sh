#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

echo "=== 1. RAM/SWAP ==="
free -m
echo ""
echo "=== 2. 尝试加 SWAP ==="
# 如果没 swap，加 1GB
swapon --show 2>/dev/null || (fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile)
swapon --show 2>/dev/null || echo "SWAP already ok or added"

echo ""
echo "=== 3. FULL BUILD (with big heap) ==="
cd /www/apps/strapi
NODE_OPTIONS="--max-old-space-size=1024" npm run build 2>&1 | tail -20

echo ""
echo "=== 4. VERIFY DIST ==="
ls -la node_modules/@strapi/admin/dist/server/server/build/index.html 2>&1

echo ""
echo "=== 5. RESTART ==="
pm2 restart strapi --update-env 2>&1 | tail -3

echo ""
echo "=== 6. WAIT ==="
for i in $(seq 1 30); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  echo "check $i: HTTP=$code"
  [ "$code" = "200" ] && break
done

echo ""
echo "=== 7. APIs ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms 2>&1 | head -c 500
echo ""
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules 2>&1 | head -c 500
echo ""
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/admin/publish/preview -H "Content-Type: application/json" -d '{"articleId":"test","accountIds":[]}' 2>&1 | head -c 500
echo ""
echo "=== 8. OAUTH ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/oauth/authorize/test 2>&1 | head -c 300

echo ""
echo "=== 9. LOGS ==="
tail -30 /home/admin/.pm2/logs/strapi-out.log
