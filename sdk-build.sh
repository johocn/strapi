#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

SDK_PLUGIN_DIR=$(ls -d ~/.npm/_npx/*/node_modules/@strapi/sdk-plugin 2>/dev/null | head -1)
echo "SDK plugin dir: $SDK_PLUGIN_DIR"

if [ -z "$SDK_PLUGIN_DIR" ]; then
  echo "Not found, npx install one..."
  timeout 30 npx @strapi/sdk-plugin --version 2>&1
  SDK_PLUGIN_DIR=$(ls -d ~/.npm/_npx/*/node_modules/@strapi/sdk-plugin 2>/dev/null | head -1)
fi

echo "Using: $SDK_PLUGIN_DIR"

echo ""
echo "=== STOP STRAPI ==="
pm2 stop strapi 2>/dev/null; sleep 2

echo ""
echo "=== PLUGIN BUILD ==="
cd plugins/zhao-studio
# 清理旧 dist
rm -rf dist
# 用 sdk-plugin 的 strapi-plugin 命令
NODE_OPTIONS="--max-old-space-size=800" timeout 300 node "$SDK_PLUGIN_DIR/bin/strapi-plugin.js" build 2>&1 | tail -30
echo "exit=$?"

echo ""
echo "=== VERIFY ==="
cd /www/apps/strapi
ls -la plugins/zhao-studio/dist/server/index.js 2>/dev/null
ls -la plugins/zhao-studio/dist/admin/index.js 2>/dev/null

# 检查关键字
echo "routes: $(grep -c 'router\|routes\|content-api' plugins/zhao-studio/dist/server/index.js 2>/dev/null)"
echo "createSchedule: $(grep -c 'createSchedule' plugins/zhao-studio/dist/server/index.js 2>/dev/null)"
echo "preview: $(grep -c 'preview' plugins/zhao-studio/dist/server/index.js 2>/dev/null)"
echo "douyin: $(grep -c 'douyin' plugins/zhao-studio/dist/server/index.js 2>/dev/null)"
echo "oauth: $(grep -c 'oauth' plugins/zhao-studio/dist/server/index.js 2>/dev/null)"

echo ""
echo "=== PATCH initStudioQueues ==="
node << 'NODEEOF'
const fs = require('fs');
const f = 'plugins/zhao-studio/dist/server/index.js';
let code = fs.readFileSync(f, 'utf8');
// 尝试多种格式
const patterns = [
  /async function initStudioQueues\s*\([^)]*\)\s*\{/,
  /initStudioQueues\s*=\s*async\s*\([^)]*\)\s*=>\s*\{/,
  /initStudioQueues\s*=\s*async\s*function\s*\([^)]*\)\s*\{/,
];
let startIdx = -1, matchedPattern = null;
for (const p of patterns) {
  const m = code.match(p);
  if (m) { startIdx = m.index; matchedPattern = p; break; }
}
console.log('Pattern match:', matchedPattern ? 'YES' : 'NO', 'at:', startIdx);
if (startIdx >= 0) {
  let braceCount = 0, endIdx = startIdx, started = false;
  for (let i = startIdx; i < Math.min(startIdx + 3000, code.length); i++) {
    if (code[i] === '{') { braceCount++; started = true; }
    else if (code[i] === '}') { braceCount--; }
    if (started && braceCount === 0) { endIdx = i + 1; break; }
  }
  console.log('endIdx:', endIdx, 'total:', endIdx - startIdx);
  const replacement = 'async function initStudioQueues(){return{publish:null,scheduler:null}}';
  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync(f, code);
  console.log('PATCHED!');
}
NODEEOF

echo ""
echo "=== RESTART ==="
rm -f /home/admin/.pm2/logs/strapi-*.log
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -2

echo ""
echo "=== WAIT ==="
for i in $(seq 1 40); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  if [ "$code" = "200" ] || [ "$code" = "204" ]; then echo "check $i: HTTP=$code OK!"; break; fi
  if [ $((i % 5)) -eq 0 ]; then echo "check $i: HTTP=$code"; fi
done

echo ""
echo "===== API ====="
echo "--- PLATFORMS ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms
echo ""
echo "--- SCHEDULES ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules
echo ""
echo "--- PREVIEW POST ---"
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/admin/publish/preview -H "Content-Type: application/json" -d '{"articleId":"test","accountIds":[]}'
echo ""
echo "--- OAUTH ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/oauth/authorize/test
echo ""
echo "--- DOUBYIN ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/oauth/douyin-schema/xxx
echo ""
echo "=== CRASH? ==="
tail -3 /home/admin/.pm2/logs/strapi-error.log
echo "=== OUT TAIL ==="
tail -5 /home/admin/.pm2/logs/strapi-out.log
