#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

echo "=== 1. Patch initStudioQueues ==="
node << 'NODEEOF'
const fs = require('fs');
let code = fs.readFileSync('plugins/zhao-studio/dist/server/index.js', 'utf8');
const startMarker = 'async function initStudioQueues()';
const startIdx = code.indexOf(startMarker);
console.log('startIdx:', startIdx);
if (startIdx >= 0) {
  // 找函数结束（esbuild 输出可能没有换行）
  let braceCount = 0, endIdx = startIdx, started = false;
  for (let i = startIdx; i < Math.min(startIdx + 2000, code.length); i++) {
    if (code[i] === '{') { braceCount++; started = true; }
    else if (code[i] === '}') { braceCount--; }
    if (started && braceCount === 0) { endIdx = i + 1; break; }
  }
  console.log('endIdx:', endIdx);
  const replacement = 'async function initStudioQueues(){return{publish:null,scheduler:null}}';
  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync('plugins/zhao-studio/dist/server/index.js', code);
  console.log('PATCHED!');
} else {
  console.log('NOT FOUND, searching alternative...');
  // esbuild 可能压成 initStudioQueues=async()=>{...}
  const m = code.match(/initStudioQueues\s*=\s*async[^{]*\{/);
  if (m) {
    console.log('Found alt:', m.index);
  }
}
NODEEOF

echo ""
echo "=== 2. Restart strapi ==="
pm2 kill 2>/dev/null; sleep 2
rm -f /home/admin/.pm2/logs/strapi-*.log
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -2

echo ""
echo "=== 3. Wait ==="
for i in $(seq 1 35); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  if [ "$code" = "200" ] || [ "$code" = "204" ]; then echo "check $i: HTTP=$code OK!"; break; fi
  if [ $((i % 5)) -eq 0 ]; then echo "check $i: HTTP=$code"; fi
done

echo ""
echo "===== API 全测 ====="

echo "--- 1. PLATFORMS GET ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms
echo ""

echo "--- 2. SCHEDULES GET ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules
echo ""

echo "--- 3. PREVIEW POST ---"
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/admin/publish/preview \
  -H "Content-Type: application/json" -d '{"articleId":"test","accountIds":[]}'
echo ""

echo "--- 4. OAUTH AUTHORIZE ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/oauth/authorize/test
echo ""

echo "--- 5. DOUBYIN SCHEMA ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/oauth/douyin-schema/test123
echo ""

echo ""
echo "===== CRASH CHECK ====="
tail -3 /home/admin/.pm2/logs/strapi-error.log 2>/dev/null | head -3
echo "--- pm2 status ---"
pm2 list strapi --no-color 2>/dev/null | tail -2
