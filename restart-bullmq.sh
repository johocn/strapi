#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"; source "$NVM_DIR/nvm.sh"

echo "=== Verify both packages ==="
node -e 'try{console.log("bull:",require("bull/package.json").version)}catch(e){console.log("bull MISSING")}'
node -e 'try{console.log("bullmq:",require("bullmq/package.json").version)}catch(e){console.log("bullmq MISSING")}'

echo ""
echo "=== Start strapi ==="
rm -f /home/admin/.pm2/logs/strapi-*.log
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -3

echo ""
echo "=== Wait ==="
for i in $(seq 1 40); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  [ "$code" = "200" ] || [ "$code" = "204" ] && { echo "UP at $i"; break; }
  [ $((i % 5)) -eq 0 ] && echo "check $i: $code"
done

echo ""
echo "=== BullMQ log check ==="
sleep 3
grep -i "bullmq\|publish worker\|scheduler worker\|Redis" /home/admin/.pm2/logs/strapi-out.log 2>/dev/null | tail -15
echo "--- errors ---"
grep -i "error\|fail\|crash" /home/admin/.pm2/logs/strapi-error.log 2>/dev/null | tail -5

echo ""
echo "=== Redis queues ==="
redis-cli -a "Joho@963963" --no-auth-warning KEYS "bullmq:*" 2>/dev/null
redis-cli -a "Joho@963963" --no-auth-warning KEYS "bullmq:studio-publish*" 2>/dev/null
redis-cli -a "Joho@963963" --no-auth-warning KEYS "bullmq:studio-scheduler*" 2>/dev/null

echo ""
echo "=== Quick API ==="
LOGIN=$(curl -s -X POST http://127.0.0.1:1337/api/auth/local -H "Content-Type: application/json" -d '{"identifier":"zhao","password":"a963963"}')
JWT=$(echo "$LOGIN" | grep -o '"jwt":"[^"]*"' | cut -d'"' -f4)
AUTH="Authorization: Bearer $JWT"
for ep in "/v1/admin/platforms" "/v1/admin/schedules" "/v1/admin/records"; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:1337/api/zhao-studio$ep" -H "$AUTH")
  [ "$CODE" = "200" ] && echo "✅ $ep → 200" || echo "❌ $ep → $CODE"
done

pm2 list --no-color 2>/dev/null | tail -4
