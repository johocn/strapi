#!/bin/bash
cd /www/apps/strapi

echo "=== 1. 恢复 admin panel build 产物 ==="
# Strapi start 需要 node_modules/@strapi/admin/dist/server/server/build/index.html
# 之前运行正常说明这个目录存在，被 npm run build 清空了
# 尝试从宿主项目的 build 目录恢复
if [ -f "node_modules/@strapi/admin/dist/server/server/build/index.html" ]; then
  echo "OK: admin build exists"
else
  echo "MISSING: admin build, trying recovery..."
  # 检查 git stash 或 backup
  git stash 2>/dev/null
  npm cache clean --force 2>/dev/null
  # 只 install @strapi/admin 重新 build
  cd node_modules/@strapi/admin && npm run build 2>&1 | tail -5 && cd /www/apps/strapi
fi

echo ""
echo "=== 2. 检查 plugin dist ==="
grep -c 'createSchedule' plugins/zhao-studio/dist/server/index.js && echo "OK: createSchedule in plugin dist"

echo ""
echo "=== 3. PM2 RESTART (dev mode 先试试) ==="
pm2 delete strapi 2>&1
pm2 start npm --name strapi -- run start 2>&1 | tail -3
sleep 15

echo ""
echo "=== 4. HEALTH CHECK ==="
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  echo "check $i: HTTP=$code"
  [ "$code" = "200" ] && break
  sleep 5
done

echo ""
echo "=== 5. LOGS ==="
tail -30 /home/admin/.pm2/logs/strapi-out.log
