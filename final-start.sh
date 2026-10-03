#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

# 停残留
pm2 stop strapi 2>/dev/null
pm2 delete strapi 2>/dev/null
sleep 2

free -m
echo "==="

# 先确认 plugin dist 是最新的
echo "plugin dist mtime:"
ls -la plugins/zhao-studio/dist/server/index.js

# start
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -2

echo ""
echo "=== WAIT ==="
for i in $(seq 1 40); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "check $i: HTTP=200 OK!"
    break
  fi
  if [ $((i % 5)) -eq 0 ]; then
    echo "check $i: HTTP=$code"
    # 看是不是又 crash 了
    online=$(pm2 list strapi --no-color 2>&1 | grep strapi | awk '{print $12}')
    echo "  pm2 status: $online"
  fi
done

echo ""
echo "=== PLATFORMS ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms 2>&1 | head -c 500
echo ""
echo ""
echo "=== SCHEDULES ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules 2>&1 | head -c 500
echo ""
echo ""
echo "=== PREVIEW ==="
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/admin/publish/preview -H "Content-Type: application/json" -d '{"articleId":"test","accountIds":[]}' 2>&1 | head -c 500
echo ""
echo ""
echo "=== OAUTH ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/oauth/authorize/test 2>&1 | head -c 300

echo ""
echo ""
echo "=== CRASH LOG (if any) ==="
tail -15 /home/admin/.pm2/logs/strapi-error.log 2>/dev/null
