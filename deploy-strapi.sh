#!/bin/bash
cd /www/apps/strapi
echo "=== BUILD ==="
npm run build 2>&1 | tail -5
echo "=== RESTART ==="
pm2 restart strapi --update-env 2>&1 | tail -3
echo "=== WAIT FOR HEALTH ==="
for i in $(seq 1 15); do
  sleep 5
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  echo "check $i: HTTP=$code"
  [ "$code" = "200" ] && break
done
echo "=== PLATFORMS ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms 2>&1 | head -c 400
echo ""
echo "=== SCHEDULES ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules 2>&1 | head -c 400
echo ""
echo "=== LOGS TAIL ==="
tail -20 /home/admin/.pm2/logs/strapi-out.log
