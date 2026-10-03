#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

echo "=== 1. 只编译 TypeScript (跳过 admin panel) ==="
NODE_OPTIONS="--max-old-space-size=512" npx tsc -p tsconfig.json 2>&1 | tail -10

echo ""
echo "=== 2. verify dist/config ==="
ls dist/config/ 2>&1
echo ""
ls dist/server/ 2>&1 | head -5

echo ""
echo "=== 3. admin panel build ==="
# 检查 admin build，手动用 vite 跑（用更少 RAM）
if [ ! -f "node_modules/@strapi/admin/dist/server/server/build/index.html" ]; then
  echo "ADMIN BUILD MISSING - try skip admin check?"
  # Strapi 5 有个环境变量可以跳过 admin build check？
  # 或者手动 build admin with small heap
  cd node_modules/@strapi/admin
  NODE_OPTIONS="--max-old-space-size=384" npx vite build 2>&1 | tail -10 || echo "admin build failed - try strapi start anyway"
  cd /www/apps/strapi
fi

echo ""
echo "=== 4. strapi start ==="
pm2 delete strapi 2>/dev/null
NODE_OPTIONS="--max-old-space-size=384" pm2 start npm --name strapi -- run start 2>&1 | tail -5

echo ""
echo "=== 5. wait ==="
for i in $(seq 1 20); do
  sleep 4
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  echo "check $i: HTTP=$code"
  [ "$code" = "200" ] && break
done

echo ""
echo "=== 6. APIs ==="
echo "--- PLATFORMS ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms 2>&1 | head -c 500
echo ""
echo "--- SCHEDULES ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules 2>&1 | head -c 500
echo ""
echo "--- PREVIEW ---"
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/admin/publish/preview -H "Content-Type: application/json" -d '{"articleId":"test","accountIds":[]}' 2>&1 | head -c 500
echo ""
echo "--- OAUTH ---"
curl -s http://127.0.0.1:1337/api/zhao-studio/oauth/authorize/test 2>&1 | head -c 300

echo ""
echo "=== 7. LOGS ==="
tail -20 /home/admin/.pm2/logs/strapi-out.log
tail -5 /home/admin/.pm2/logs/strapi-error.log
