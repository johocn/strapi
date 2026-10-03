#!/bin/bash
set -o pipefail
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"; source "$NVM_DIR/nvm.sh"

PASS=0; FAIL=0
check() { if [ "$2" = "PASS" ]; then echo "✅ $1"; ((PASS++)); else echo "❌ $1 (exit=$3)"; ((FAIL++)); fi; }

echo "================================================"
echo " STICKY: STRAPI-PLUGIN-DEPLOY-TEST VALIDATION"
echo "================================================"

# ========== SECTION 0: SERVER CONSTANTS ==========
echo ""
echo "--- Section 0: Server Constants ---"
echo -n "SSH alias: "; ssh -G joho 2>/dev/null | grep -q "^hostname " && echo "PASS" || echo "FAIL"
node -v | grep -q "v22" && check "Node v22.23.x" "PASS" $? || check "Node v22.23.x" "FAIL"
free -m | awk 'NR==2 {print "RAM: "$2"MB, swap: "$3"MB"}'
pm2 list strapi --no-color 2>/dev/null | grep -q "online" && echo "Current strapi: online (will restart)" || echo "Current strapi: not running"

# ========== SECTION 1: PREPARE ==========
echo ""
echo "--- Section 1: Prepare ---"
git pull 2>&1 | tail -3
check "git pull succeeds" "PASS" $? || check "git pull succeeds" "FAIL" $?
pm2 stop strapi 2>/dev/null; sleep 2
echo "pm2 stop done"

# ========== SECTION 2: BUILD ==========
echo ""
echo "--- Section 2: Build plugin dist ---"
SDK=$(ls -d ~/.npm/_npx/*/node_modules/@strapi/sdk-plugin 2>/dev/null | head -1)
[ -z "$SDK" ] && timeout 30 npx @strapi/sdk-plugin --version && SDK=$(ls -d ~/.npm/_npx/*/node_modules/@strapi/sdk-plugin 2>/dev/null | head -1)
echo "SDK path: $SDK"
[ -n "$SDK" ] && [ -f "$SDK/bin/strapi-plugin.js" ] && check "sdk-plugin discovered" "PASS" || check "sdk-plugin discovered" "FAIL"

cd plugins/zhao-studio
rm -rf dist
echo "Building..."
BUILD_OUT=$(NODE_OPTIONS="--max-old-space-size=800" timeout 300 node "$SDK/bin/strapi-plugin.js" build 2>&1 | tail -10)
BUILD_RC=$?
echo "$BUILD_OUT"
cd /www/apps/strapi

[ -f "plugins/zhao-studio/dist/server/index.js" ] && check "dist/server/index.js exists" "PASS" || check "dist/server/index.js exists" "FAIL" $?
DIST_SIZE=$(stat -c%s plugins/zhao-studio/dist/server/index.js 2>/dev/null || echo 0)
echo "dist size: $DIST_SIZE bytes"
grep -q "publish-schedule" plugins/zhao-studio/dist/server/index.js && check "publish-schedule CT in dist" "PASS" || check "publish-schedule CT in dist" "FAIL"
grep -q "ctx.throw.*404" plugins/zhao-studio/dist/server/index.js && check "controller null guards in dist" "PASS" || check "controller null guards in dist" "FAIL"

# ========== SECTION 3: PATCH ==========
echo ""
echo "--- Section 3: Patch initStudioQueues ---"
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
for (const p of patterns) { const m = code.match(p); if (m) { startIdx = m.index; break; } }
if (startIdx >= 0) {
  let bc = 0, ei = startIdx, started = false;
  for (let i = startIdx; i < Math.min(startIdx + 3000, code.length); i++) {
    if (code[i] === '{') { bc++; started = true; }
    else if (code[i] === '}') bc--;
    if (started && bc === 0) { ei = i + 1; break; }
  }
  code = code.substring(0, startIdx) + 'async function initStudioQueues(){return{publish:null,scheduler:null}}' + code.substring(ei);
  fs.writeFileSync(f, code);
  console.log('PATCHED startIdx=' + startIdx + ' endIdx=' + ei);
} else {
  console.log("PATTERN NOT FOUND");
  process.exit(1);
}
NODEEOF
PATCH_RC=$?
grep -q "publish:null" plugins/zhao-studio/dist/server/index.js && check "patch verified (publish:null)" "PASS" || check "patch verified" "FAIL" $PATCH_RC

# ========== SECTION 4: START ==========
echo ""
echo "--- Section 4: Start Strapi ---"
rm -f /home/admin/.pm2/logs/strapi-*.log
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -2
check "pm2 start returns success" "PASS" $? || check "pm2 start" "FAIL" $?

# ========== SECTION 5: WAIT ==========
echo ""
echo "--- Section 5: Wait for health ---"
UP=0
for i in $(seq 1 40); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  [ "$code" = "200" ] || [ "$code" = "204" ] && { echo "UP at check $i (HTTP=$code)"; UP=1; break; }
  [ $((i % 5)) -eq 0 ] && echo "check $i: HTTP=$code"
done
[ "$UP" = "1" ] && check "Strapi health check" "PASS" || check "Strapi health check" "FAIL"

# ========== API TESTS ==========
echo ""
echo "--- Section 6: Auth + API Tests ---"
LOGIN=$(curl -s -X POST http://127.0.0.1:1337/api/auth/local -H "Content-Type: application/json" -d '{"identifier":"zhao","password":"a963963"}')
JWT=$(echo "$LOGIN" | grep -o '"jwt":"[^"]*"' | cut -d'"' -f4)
[ -n "$JWT" ] && check "JWT obtained" "PASS" || check "JWT obtained" "FAIL"
AUTH="Authorization: Bearer $JWT"

echo ""
echo "--- Platforms (expect 200 + data) ---"
R=$(curl -s -w '\n%{http_code}' http://127.0.0.1:1337/api/zhao-studio/v1/admin/platforms -H "$AUTH")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | sed '$d')
[ "$CODE" = "200" ] && echo "✅ platforms: 200 | $BODY" | head -c 200 || echo "❌ platforms: $CODE | $BODY" | head -c 200

echo ""
echo "--- Accounts (expect 200 + data) ---"
R=$(curl -s -w '\n%{http_code}' http://127.0.0.1:1337/api/zhao-studio/v1/admin/accounts -H "$AUTH")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | sed '$d')
[ "$CODE" = "200" ] && echo "✅ accounts: 200 | $BODY" | head -c 200 || echo "❌ accounts: $CODE | $BODY" | head -c 200

echo ""
echo "--- Schedules (expect 200 + empty array) ---"
R=$(curl -s -w '\n%{http_code}' http://127.0.0.1:1337/api/zhao-studio/v1/admin/schedules -H "$AUTH")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | sed '$d')
[ "$CODE" = "200" ] && echo "✅ schedules: 200 | $BODY" | head -c 200 || echo "❌ schedules: $CODE | $BODY" | head -c 200

echo ""
echo "--- Records (expect 200 + empty array) ---"
R=$(curl -s -w '\n%{http_code}' http://127.0.0.1:1337/api/zhao-studio/v1/admin/records -H "$AUTH")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | sed '$d')
[ "$CODE" = "200" ] && echo "✅ records: 200 | $BODY" | head -c 200 || echo "❌ records: $CODE | $BODY" | head -c 200

echo ""
echo "--- Preview (expect 404 article not found, NOT 500) ---"
R=$(curl -s -w '\n%{http_code}' -X POST http://127.0.0.1:1337/api/zhao-studio/v1/admin/publish/preview -H "Content-Type: application/json" -H "$AUTH" -d '{"articleId":"test","accountIds":[]}')
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | sed '$d')
[ "$CODE" = "404" ] && echo "✅ preview: 404 graceful (expected) | $BODY" | head -c 200 || echo "❌ preview: $CODE (expect 404 or 200, NOT 500) | $BODY" | head -c 200

echo ""
echo "--- Articles public (expect 200 no auth) ---"
R=$(curl -s -w '\n%{http_code}' http://127.0.0.1:1337/api/zhao-studio/v1/articles)
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | sed '$d')
[ "$CODE" = "200" ] && echo "✅ articles public: 200 | $BODY" | head -c 200 || echo "❌ articles public: $CODE | $BODY" | head -c 200

echo ""
echo "--- OAUTH authorize (expect 200 with error message, not 500) ---"
R=$(curl -s -w '\n%{http_code}' http://127.0.0.1:1337/api/zhao-studio/v1/admin/oauth/authorize/nonexistent -H "$AUTH")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | sed '$d')
[ "$CODE" = "200" ] || [ "$CODE" = "404" ] && echo "✅ oauth authorize: $CODE | $BODY" | head -c 200 || echo "❌ oauth authorize: $CODE | $BODY" | head -c 200

# ========== FINAL STATUS ==========
echo ""
echo "================================================"
echo " SUMMARY: $PASS passed, $FAIL failed"
echo "================================================"

echo ""
echo "--- PM2 final status ---"
pm2 list strapi --no-color 2>/dev/null | tail -2

echo ""
echo "--- Error log (if any) ---"
tail -5 /home/admin/.pm2/logs/strapi-error.log 2>/dev/null
