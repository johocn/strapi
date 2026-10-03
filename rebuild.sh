#!/bin/bash
set -o pipefail
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"; source "$NVM_DIR/nvm.sh"

echo "=== Pull ==="
git pull 2>&1 | tail -2

echo ""
echo "=== Stop strapi + vendure ==="
pm2 stop strapi vendure vendure-worker nshop 2>/dev/null; sleep 3

echo ""
echo "=== Build ==="
SDK=$(ls -d ~/.npm/_npx/*/node_modules/@strapi/sdk-plugin 2>/dev/null | head -1)
cd plugins/zhao-studio
rm -rf dist
NODE_OPTIONS="--max-old-space-size=800" timeout 300 node "$SDK/bin/strapi-plugin.js" build 2>&1 | tail -12
cd /www/apps/strapi

echo ""
echo "=== Check dist: bullmq externalized? ==="
[ -f plugins/zhao-studio/dist/server/index.js ] && echo "✅ dist exists" || echo "❌ dist missing"
echo "--- dist size ---"
stat -c%s plugins/zhao-studio/dist/server/index.js
echo "--- bullmq require pattern ---"
grep -c "require.*bullmq" plugins/zhao-studio/dist/server/index.js || echo "0 require('bullmq')"
grep -c "from.*bullmq" plugins/zhao-studio/dist/server/index.js || echo "0 from 'bullmq'"

echo ""
echo "=== Start ==="
rm -f /home/admin/.pm2/logs/strapi-*.log
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -2

echo ""
echo "=== Wait ==="
UP=0
for i in $(seq 1 50); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  [ "$code" = "200" ] || [ "$code" = "204" ] && { echo "UP at $i"; UP=1; break; }
  [ $((i % 5)) -eq 0 ] && echo "check $i: $code"
done

if [ "$UP" != "1" ]; then
  echo "❌ CRASH. last 30 err lines:"
  tail -30 /home/admin/.pm2/logs/strapi-error.log
  echo "--- last 30 out lines ---"
  tail -30 /home/admin/.pm2/logs/strapi-out.log
  pm2 delete strapi 2>/dev/null
  pm2 restart vendure 2>/dev/null
  exit 1
fi

echo ""
echo "=== BullMQ registration check ==="
sleep 3
grep -i "bullmq\|publish worker\|scheduler worker\|studio-publish\|studio-scheduler" /home/admin/.pm2/logs/strapi-out.log | tail -10

echo ""
echo "=== Redis queues ==="
redis-cli -a "Joho@963963" --no-auth-warning KEYS "bullmq:*" 2>/dev/null
redis-cli -a "Joho@963963" --no-auth-warning KEYS "bullmq:studio-*" 2>/dev/null

echo ""
echo "=== API ==="
LOGIN=$(curl -s -X POST http://127.0.0.1:1337/api/auth/local -H "Content-Type: application/json" -d '{"identifier":"zhao","password":"a963963"}')
JWT=$(echo "$LOGIN" | grep -o '"jwt":"[^"]*"' | cut -d'"' -f4)
AUTH="Authorization: Bearer $JWT"
for ep in "/v1/admin/platforms" "/v1/admin/schedules" "/v1/admin/records"; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:1337/api/zhao-studio$ep" -H "$AUTH")
  [ "$CODE" = "200" ] && echo "✅ $ep → 200" || echo "❌ $ep → $CODE"
done

echo ""
echo "=== Restore vendure ==="
pm2 restart vendure 2>/dev/null
sleep 2
pm2 list --no-color 2>/dev/null | tail -4
