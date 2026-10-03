#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use node 22 2>/dev/null || true

echo "=== NODE ==="
which node && node -v
which npm && npm -v
which run || echo "no run command"

echo ""
echo "=== ADMIN BUILD ==="
cd node_modules/@strapi/admin
# try npx run
NODE_OPTIONS="--max-old-space-size=512" npx run npm-run-all clean --parallel "build:code build:types" 2>&1 | tail -15 || \
NODE_OPTIONS="--max-old-space-size=512" npm run build 2>&1 | tail -15
cd /www/apps/strapi

echo ""
echo "=== VERIFY ==="
ls -la node_modules/@strapi/admin/dist/server/server/build/index.html 2>&1

echo ""
echo "=== PM2 RESTART ==="
pm2 restart strapi --update-env 2>&1 | tail -3

echo ""
echo "=== WAIT ==="
for i in $(seq 1 30); do
  sleep 5
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  echo "check $i: HTTP=$code"
  [ "$code" = "200" ] && break
done

echo ""
echo "=== TEST ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms 2>&1 | head -c 500
echo ""
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules 2>&1 | head -c 500
echo ""
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/admin/publish/preview -H "Content-Type: application/json" -d '{"articleId":"test","accountIds":[]}' 2>&1 | head -c 500

echo ""
echo "=== LOGS ==="
tail -30 /home/admin/.pm2/logs/strapi-out.log
