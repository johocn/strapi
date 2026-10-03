#!/bin/bash
cd /www/apps/strapi

echo "=== PATCH dist ==="
node << 'NODEEOF'
const fs = require('fs');
let code = fs.readFileSync('plugins/zhao-studio/dist/server/index.js', 'utf8');

// 找到 "async function initStudioQueues() {" 
// 然后找到这个函数的结束位置（配对大括号）
const startMarker = 'async function initStudioQueues() {';
const startIdx = code.indexOf(startMarker);
console.log('startIdx:', startIdx);

if (startIdx >= 0) {
  let braceCount = 0;
  let endIdx = startIdx;
  let started = false;
  for (let i = startIdx; i < code.length; i++) {
    if (code[i] === '{') { braceCount++; started = true; }
    else if (code[i] === '}') { braceCount--; }
    if (started && braceCount === 0) { endIdx = i + 1; break; }
  }
  console.log('Function ends at:', endIdx);
  console.log('Original length:', endIdx - startIdx);
  
  const replacement = 'async function initStudioQueues() { return { publish: null, scheduler: null }; }';
  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync('plugins/zhao-studio/dist/server/index.js', code);
  console.log('PATCHED successfully!');
  
  // 验证
  const verifyIdx = code.indexOf('async function initStudioQueues()');
  console.log('After patch:', code.substring(verifyIdx, verifyIdx + 100));
} else {
  console.log('startMarker not found!');
}
NODEEOF

echo ""
echo "=== VERIFY ==="
grep -A2 "async function initStudioQueues" plugins/zhao-studio/dist/server/index.js | head -5

echo ""
echo "=== FIND strapi-plugin binary ==="
find node_modules -name "strapi-plugin" 2>/dev/null
find node_modules -path "*sdk-plugin*bin*" 2>/dev/null | head -3

echo ""
echo "=== RESTART ==="
pm2 kill 2>/dev/null; sleep 2
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -2

echo ""
echo "=== WAIT ==="
for i in $(seq 1 35); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  if [ "$code" = "200" ]; then echo "check $i: HTTP=200 OK!"; break; fi
  if [ $((i % 5)) -eq 0 ]; then echo "check $i: HTTP=$code"; fi
done

echo ""
echo "=== PLATFORMS ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms 2>&1
echo ""
echo "=== SCHEDULES ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules 2>&1
echo ""
echo "=== PREVIEW ==="
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/admin/publish/preview -H "Content-Type: application/json" -d '{"articleId":"test","accountIds":[]}' 2>&1
echo ""
echo "=== OAUTH ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/oauth/authorize/test 2>&1
echo ""
echo "=== DOUBYIN ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/oauth/douyin-schema/xxx 2>&1

echo ""
echo "=== CRASH? ==="
tail -3 /home/admin/.pm2/logs/strapi-error.log 2>/dev/null
