#!/bin/bash
set -e
cd /www/apps/strapi

echo "=== 1. check admin dir ==="
ls -la node_modules/@strapi/admin/dist/server/server/build/ 2>&1 | head -5 || echo "NO BUILD DIR"

echo ""
echo "=== 2. rebuild admin only ==="
cd node_modules/@strapi/admin
NODE_OPTIONS="--max-old-space-size=512" npm run build 2>&1 | tail -10
cd /www/apps/strapi

echo ""
echo "=== 3. verify ==="
ls -la node_modules/@strapi/admin/dist/server/server/build/index.html 2>&1
echo ""
grep -c 'createSchedule' plugins/zhao-studio/dist/server/index.js

echo ""
echo "=== 4. pm2 restart ==="
pm2 restart strapi --update-env 2>&1 | tail -3

echo ""
echo "=== 5. wait ==="
for i in $(seq 1 24); do
  sleep 5
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  echo "check $i: HTTP=$code"
  [ "$code" = "200" ] && break
done

echo ""
echo "=== 6. test ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms 2>&1 | head -c 500
echo ""
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules 2>&1 | head -c 500
echo ""

echo ""
echo "=== 7. logs ==="
tail -30 /home/admin/.pm2/logs/strapi-out.log
