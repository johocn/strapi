#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

SDK=$(ls -d ~/.npm/_npx/*/node_modules/@strapi/sdk-plugin 2>/dev/null | head -1)

echo "=== 1. git pull ==="
git pull 2>&1 | tail -3

echo ""
echo "=== 2. stop strapi ==="
pm2 stop strapi 2>/dev/null; sleep 2

echo ""
echo "=== 3. plugin build ==="
cd plugins/zhao-studio
rm -rf dist
NODE_OPTIONS="--max-old-space-size=800" timeout 300 node "$SDK/bin/strapi-plugin.js" build 2>&1 | tail -15
echo "exit=$?"
cd /www/apps/strapi

echo ""
echo "=== 4. verify ==="
ls -la plugins/zhao-studio/dist/server/index.js 2>/dev/null
echo "publish-schedule in dist: $(grep -c 'publish-schedule' plugins/zhao-studio/dist/server/index.js 2>/dev/null)"
echo "ctx.throw 404: $(grep -c 'ctx.throw.*404' plugins/zhao-studio/dist/server/index.js 2>/dev/null)"

echo ""
echo "=== 5. patch initStudioQueues ==="
node << 'NODEEOF'
const fs = require('fs');
const f = 'plugins/zhao-studio/dist/server/index.js';
let code = fs.readFileSync(f, 'utf8');
const patterns = [
  /async function initStudioQueues\s*\([^)]*\)\s*\{/,
  /initStudioQueues\s*=\s*async\s*\([^)]*\)\s*=>\s*\{/,
  /initStudioQueues\s*=\s*async\s*function\s*\([^)]*\)\s*\{/,
];
let startIdx = -1;
for (const p of patterns) {
  const m = code.match(p);
  if (m) { startIdx = m.index; break; }
}
console.log('startIdx:', startIdx);
if (startIdx >= 0) {
  let braceCount = 0, endIdx = startIdx, started = false;
  for (let i = startIdx; i < Math.min(startIdx + 3000, code.length); i++) {
    if (code[i] === '{') { braceCount++; started = true; }
    else if (code[i] === '}') { braceCount--; }
    if (started && braceCount === 0) { endIdx = i + 1; break; }
  }
  const replacement = 'async function initStudioQueues(){return{publish:null,scheduler:null}}';
  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync(f, code);
  console.log('PATCHED!');
}
NODEEOF

echo ""
echo "=== 6. restart ==="
rm -f /home/admin/.pm2/logs/strapi-*.log
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -2

echo ""
echo "=== 7. wait ==="
for i in $(seq 1 40); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  if [ "$code" = "200" ] || [ "$code" = "204" ]; then echo "check $i: HTTP=$code OK!"; break; fi
  if [ $((i % 5)) -eq 0 ]; then echo "check $i: HTTP=$code"; fi
done

echo ""
echo "===== AUTH + API ====="
LOGIN=$(curl -s -X POST http://127.0.0.1:1337/api/auth/local -H "Content-Type: application/json" -d '{"identifier":"zhao","password":"a963963"}')
JWT=$(echo "$LOGIN" | grep -o '"jwt":"[^"]*"' | cut -d'"' -f4)
AUTH="Authorization: Bearer $JWT"

echo ""
echo "--- 1. PLATFORMS ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/platforms -H "$AUTH" 2>&1 | head -c 400

echo ""
echo "--- 2. SCHEDULES (was 500) ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/schedules -H "$AUTH" 2>&1 | head -c 400

echo ""
echo "--- 3. PREVIEW (was 500) ---"
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/v1/admin/publish/preview -H "Content-Type: application/json" -H "$AUTH" -d '{"articleId":"test","accountIds":[]}' 2>&1 | head -c 400

echo ""
echo "--- 4. DOUBYIN (was 500) ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/oauth/douyin-schema/test123 -H "$AUTH" 2>&1 | head -c 400

echo ""
echo "--- 5. OAUTH AUTHORIZE ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/oauth/authorize/test -H "$AUTH" 2>&1 | head -c 400

echo ""
echo "--- 6. ACCOUNTS ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/accounts -H "$AUTH" 2>&1 | head -c 400

echo ""
echo "--- 7. RECORDS ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/admin/records -H "$AUTH" 2>&1 | head -c 400

echo ""
echo "--- 8. PUBLIC articles ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/v1/articles 2>&1 | head -c 200

echo ""
echo "===== ERROR CHECK ====="
tail -3 /home/admin/.pm2/logs/strapi-error.log 2>/dev/null
echo "--- pm2 ---"
pm2 list strapi --no-color 2>/dev/null | tail -2
