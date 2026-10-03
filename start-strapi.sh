#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

echo "=== RAM ==="
free -m
echo ""
echo "=== Kill old strapi + dev processes ==="
pkill -f "strapi" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "npm run develop" 2>/dev/null
sleep 3
free -m

echo ""
echo "=== PM2: 暂时停 vendure-worker 释放内存 ==="
pm2 stop vendure-worker 2>/dev/null || echo "no vendure-worker in pm2"
# nshop 也可能占内存，先不管
sleep 2
free -m

echo ""
echo "=== Start strapi with bigger heap ==="
pm2 delete strapi 2>/dev/null
NODE_OPTIONS="--max-old-space-size=600" pm2 start npm --name strapi -- run start 2>&1 | tail -3

echo ""
echo "=== Wait ==="
for i in $(seq 1 30); do
  sleep 4
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  if [ "$i" -le 5 ] || [ "$code" = "200" ]; then
    echo "check $i: HTTP=$code"
  fi
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
echo "=== LOGS ==="
tail -25 /home/admin/.pm2/logs/strapi-out.log
echo "=== ERR ==="
tail -10 /home/admin/.pm2/logs/strapi-error.log
