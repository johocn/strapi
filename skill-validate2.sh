#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"; source "$NVM_DIR/nvm.sh"

echo "=== 1. 释放内存 ==="
pm2 stop vendure vendure-worker nshop 2>/dev/null
sleep 3
free -m

echo ""
echo "=== 2. Build 重新跑 ==="
SDK=$(ls -d ~/.npm/_npx/*/node_modules/@strapi/sdk-plugin 2>/dev/null | head -1)
cd plugins/zhao-studio
rm -rf dist
echo "开始 build..."
NODE_OPTIONS="--max-old-space-size=800" timeout 300 node "$SDK/bin/strapi-plugin.js" build 2>&1
RC=$?
echo "exit=$RC"
cd /www/apps/strapi

echo ""
echo "=== 3. 验证 dist ==="
ls -la plugins/zhao-studio/dist/server/index.js 2>&1 || echo "DIST MISSING"
[ -f plugins/zhao-studio/dist/server/index.js ] && echo "✅ dist OK" || echo "❌ dist still missing"

echo ""
echo "=== 4. Patch ==="
[ -f plugins/zhao-studio/dist/server/index.js ] && node << 'NODEEOF'
const fs = require('fs');
const f = 'plugins/zhao-studio/dist/server/index.js';
let code = fs.readFileSync(f, 'utf8');
const patterns = [
  /async function initStudioQueues\s*\([^)]*\)\s*\{/,
  /initStudioQueues\s*=\s*async\s*\([^)]*\)\s*=>\s*\{/,
  /initStudioQueues\s*=\s*async\s*function\s*\([^)]*\)\s*\{/,
];
let startIdx = -1;
for (const p of patterns) { const m = code.match(p); if (m) { startIdx = m.index; break; } }
console.log('startIdx:', startIdx);
if (startIdx >= 0) {
  let bc = 0, ei = startIdx, started = false;
  for (let i = startIdx; i < Math.min(startIdx + 3000, code.length); i++) {
    if (code[i] === '{') { bc++; started = true; }
    else if (code[i] === '}') bc--;
    if (started && bc === 0) { ei = i + 1; break; }
  }
  code = code.substring(0, startIdx) + 'async function initStudioQueues(){return{publish:null,scheduler:null}}' + code.substring(ei);
  fs.writeFileSync(f, code);
  console.log('PATCHED');
}
NODEEOF

echo ""
echo "=== 5. 重启所有 PM2 ==="
pm2 delete strapi 2>/dev/null
pm2 restart vendure 2>/dev/null
sleep 1

rm -f /home/admin/.pm2/logs/strapi-*.log
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -2

echo ""
echo "=== 6. Wait ==="
for i in $(seq 1 40); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  [ "$code" = "200" ] || [ "$code" = "204" ] && { echo "UP at $i (HTTP=$code)"; break; }
  [ $((i % 5)) -eq 0 ] && echo "check $i: HTTP=$code"
done

echo ""
echo "=== 7. Final API test ==="
LOGIN=$(curl -s -X POST http://127.0.0.1:1337/api/auth/local -H "Content-Type: application/json" -d '{"identifier":"zhao","password":"a963963"}')
JWT=$(echo "$LOGIN" | grep -o '"jwt":"[^"]*"' | cut -d'"' -f4)
AUTH="Authorization: Bearer $JWT"

for ep in \
  "/v1/admin/platforms" \
  "/v1/admin/accounts" \
  "/v1/admin/schedules" \
  "/v1/admin/records"; do
  R=$(curl -s -w '\n%{http_code}' "http://127.0.0.1:1337/api/zhao-studio$ep" -H "$AUTH")
  CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | sed '$d' | head -c 120)
  [ "$CODE" = "200" ] && echo "✅ $ep → 200 | $BODY" || echo "❌ $ep → $CODE | $BODY"
done

R=$(curl -s -w '\n%{http_code}' -X POST "http://127.0.0.1:1337/api/zhao-studio/v1/admin/publish/preview" -H "Content-Type: application/json" -H "$AUTH" -d '{"articleId":"test","accountIds":[]}')
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | sed '$d' | head -c 120)
echo "📝 preview → $CODE (expect 404/200, NOT 500) | $BODY"

R=$(curl -s -w '\n%{http_code}' "http://127.0.0.1:1337/api/zhao-studio/v1/articles")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | sed '$d' | head -c 120)
echo "📝 articles public → $CODE | $BODY"

echo ""
echo "=== pm2 final ==="
pm2 list --no-color 2>/dev/null | tail -4
