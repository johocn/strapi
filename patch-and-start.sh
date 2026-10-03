#!/bin/bash
cd /www/apps/strapi

echo "=== 1. 找 initStudioQueues ==="
grep -c "initStudioQueues" plugins/zhao-studio/dist/server/index.js

echo ""
echo "=== 2. Bull Queue 构造出现次数 ==="
grep -c "new Queue" plugins/zhao-studio/dist/server/index.js

echo ""
echo "=== 3. 手动 patch：把所有 Bull Queue 构造跳过 ==="
# 方案：用 node 脚本 patch
node -e "
const fs = require('fs');
let code = fs.readFileSync('plugins/zhao-studio/dist/server/index.js', 'utf8');

// 找到 initStudioQueues 函数定义
// Vite bundle 里可能是 initStudioQueues = async function(...)
// 把整个函数体替换成 return { publish: null, scheduler: null }
const pattern = /(initStudioQueues\s*=\s*async function[^}]*?\{)([\s\S]*?)(^\})/m;
const match = code.match(pattern);
if (match) {
  console.log('Found initStudioQueues function, patching...');
  code = code.replace(pattern, match[1] + ' return{return{publish:null,scheduler:null}} ' + match[3]);
  fs.writeFileSync('plugins/zhao-studio/dist/server/index.js', code);
  console.log('Patched!');
} else {
  console.log('Pattern not found, trying alternative...');
  // 搜索更简单的模式
  const lines = code.split('\n');
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('initStudioQueues') && lines[i].includes('async')) {
      idx = i;
      break;
    }
  }
  console.log('Line with initStudioQueues:', idx);
  if (idx >= 0) {
    for (let j = idx; j < Math.min(idx + 5, lines.length); j++) {
      console.log('  Line', j, ':', lines[j].substring(0, 100));
    }
  }
}
"
echo "exit=$?"

echo ""
echo "=== 4. verify patch ==="
grep -o "return.publish.null" plugins/zhao-studio/dist/server/index.js | head -3

echo ""
echo "=== 5. restart ==="
pm2 kill 2>/dev/null; sleep 2
rm -f /home/admin/.pm2/logs/strapi-*.log
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -2

echo ""
echo "=== 6. wait ==="
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
echo "=== CRASH LOG ==="
tail -5 /home/admin/.pm2/logs/strapi-error.log
tail -5 /home/admin/.pm2/logs/strapi-out.log
