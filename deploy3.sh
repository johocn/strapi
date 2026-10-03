#!/bin/bash
cd /www/apps/strapi
echo "=== PRE CHECK ==="
ls -la node_modules/@strapi/admin/dist/server/server/build/index.html 2>&1
echo ""
echo "=== FULL BUILD (NO TAIL - wait complete) ==="
npm run build
BUILD_RC=$?
echo ""
echo "=== BUILD RC=$BUILD_RC ==="
echo "=== POST CHECK ==="
ls -la node_modules/@strapi/admin/dist/server/server/build/index.html 2>&1
echo ""
echo "=== DIST CHECK ==="
ls -la dist/build/index.html 2>&1
ls -la dist/server/ 2>&1
echo ""
echo "=== GREP createSchedule in DIST ==="
grep -c 'createSchedule' dist/server/index.js 2>&1 || echo "not found in dist/server"
echo ""
echo "=== PM2 RESTART ==="
pm2 restart strapi --update-env 2>&1 | tail -5
echo ""
echo "=== WAIT FOR HEALTH ==="
for i in $(seq 1 24); do
  sleep 5
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  echo "check $i: HTTP=$code"
  [ "$code" = "200" ] && break
done
echo ""
echo "=== TEST PLATFORMS ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms 2>&1 | head -c 500
echo ""
echo "=== TEST SCHEDULES ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules 2>&1 | head -c 500
echo ""
echo "=== LOGS TAIL ==="
tail -30 /home/admin/.pm2/logs/strapi-out.log
