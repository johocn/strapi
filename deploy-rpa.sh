#!/bin/bash
set -o pipefail
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"; source "$NVM_DIR/nvm.sh"

echo "=== Pull ==="
git pull 2>&1 | tail -3

echo ""
echo "=== Stop ==="
pm2 stop strapi vendure vendure-worker nshop 2>/dev/null; sleep 3

echo ""
echo "=== Build ==="
SDK=$(ls -d ~/.npm/_npx/*/node_modules/@strapi/sdk-plugin 2>/dev/null | head -1)
cd plugins/zhao-studio
rm -rf dist
NODE_OPTIONS="--max-old-space-size=800" timeout 300 node "$SDK/bin/strapi-plugin.js" build 2>&1 | tail -6
cd /www/apps/strapi

echo ""
echo "=== Verify dist (playwright should NOT be bundled) ==="
echo "--- dist size ---"
stat -c%s plugins/zhao-studio/dist/server/index.js
echo "--- playwright in dist? (expect 0) ---"
grep -c "require.*playwright\|from.*playwright" plugins/zhao-studio/dist/server/index.js || echo "0 (OK - dynamic import not bundled)"
echo "--- rpa-client service present? ---"
grep -c "rpa-client" plugins/zhao-studio/dist/server/index.js || echo "0"

echo ""
echo "=== Start ==="
rm -f /home/admin/.pm2/logs/strapi-*.log
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -2

echo ""
echo "=== Wait ==="
for i in $(seq 1 50); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  [ "$code" = "200" ] || [ "$code" = "204" ] && { echo "UP at $i"; break; }
  [ $((i % 5)) -eq 0 ] && echo "check $i: $code"
done

echo ""
echo "=== Log check (no crash expected) ==="
sleep 3
grep -i "bullmq\|register.*worker\|rpa-client\|rpaCookies" /home/admin/.pm2/logs/strapi-out.log 2>/dev/null | tail -10
echo "--- errors ---"
grep -i "error\|fail\|crash\|Cannot find.*rpa" /home/admin/.pm2/logs/strapi-error.log 2>/dev/null | tail -5 || echo "(no error)"

echo ""
echo "=== API smoke ==="
LOGIN=$(curl -s -X POST http://127.0.0.1:1337/api/auth/local -H "Content-Type: application/json" -d '{"identifier":"zhao","password":"a963963"}')
JWT=$(echo "$LOGIN" | grep -o '"jwt":"[^"]*"' | cut -d'"' -f4)
AUTH="Authorization: Bearer $JWT"
for ep in "/v1/admin/platforms" "/v1/admin/records" "/v1/admin/schedules"; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:1337/api/zhao-studio$ep" -H "$AUTH")
  [ "$CODE" = "200" ] && echo "✅ $ep → 200" || echo "❌ $ep → $CODE"
done

echo ""
echo "=== Restore vendure ==="
pm2 restart vendure 2>/dev/null
sleep 2
pm2 list --no-color 2>/dev/null | tail -4
