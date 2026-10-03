#!/bin/bash
echo "=== ERR LOG ==="
tail -20 /home/admin/.pm2/logs/strapi-error.log 2>&1
echo ""
echo "=== PM2 STATUS ==="
pm2 show strapi 2>&1 | tail -20
echo ""
echo "=== TRY DEV MODE ==="
cd /www/apps/strapi
pm2 delete strapi 2>/dev/null
# 使用 strapi develop (dev 模式跳过 admin build 检查)
NODE_OPTIONS="--max-old-space-size=256" pm2 start npm --name strapi -- run develop 2>&1 | tail -5
sleep 15
for i in $(seq 1 20); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  echo "check $i: HTTP=$code"
  [ "$code" = "200" ] && break
done
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms 2>&1 | head -c 300
echo ""
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules 2>&1 | head -c 300
echo ""
tail -10 /home/admin/.pm2/logs/strapi-out.log
