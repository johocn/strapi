#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

echo "=== 1. FULL STOP ==="
pm2 kill 2>/dev/null
sleep 2

echo "=== 2. CLEAR LOGS ==="
rm -f /home/admin/.pm2/logs/strapi-*.log

echo "=== 3. VERIFY DIST ==="
ls -la plugins/zhao-studio/dist/server/index.js
echo "initStudioQueues grep:"
grep -A3 "initStudioQueues" plugins/zhao-studio/dist/server/index.js | head -5

echo ""
echo "=== 4. START ==="
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -3
sleep 5

echo ""
echo "=== 5. CHECK STATUS ==="
pm2 list strapi --no-color 2>&1 | tail -5

echo ""
echo "=== 6. WAIT ==="
for i in $(seq 1 40); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "check $i: HTTP=200 OK!"
    break
  fi
  if [ $((i % 5)) -eq 0 ]; then
    echo "check $i: HTTP=$code"
    online=$(pm2 list strapi --no-color 2>&1 | grep strapi | awk '{print $12}')
    echo "  pm2: $online"
  fi
done

echo ""
echo "=== FULL OUT ==="
cat /home/admin/.pm2/logs/strapi-out.log 2>/dev/null | tail -40
echo ""
echo "=== FULL ERR ==="
cat /home/admin/.pm2/logs/strapi-error.log 2>/dev/null | tail -10
