#!/bin/bash
cd /www/apps/strapi

echo "=== 1. dist 当前状态 ==="
ls -la dist/ 2>&1 | head -5
echo ""

echo "=== 2. git restore dist/ 从最后一个完整构建 ==="
# 找一个有 dist 的 commit
git log --oneline -- dist/ | head -5

echo ""
echo "=== 3. restore dist/config 和 dist/server 和 dist/build ==="
# 尝试从 commit e526ebf9b1 恢复
git checkout e526ebf9b1 -- dist/config dist/server dist/build 2>&1
echo "exit=$?"

echo ""
echo "=== 4. verify dist ==="
ls dist/ 2>&1
echo ""
ls dist/config/ 2>&1 | head -5
echo ""
ls dist/build/ 2>&1 | head -5
echo ""
ls dist/server/ 2>&1 | head -5

echo ""
echo "=== 5. admin build ==="
ls node_modules/@strapi/admin/dist/server/server/build/index.html 2>&1

echo ""
echo "=== 6. 如果 dist 恢复成功，直接 start ==="
if [ -f "dist/config/database.js" ]; then
  echo "DIST OK - try strapi start"
  pm2 delete strapi 2>/dev/null
  NODE_OPTIONS="--max-old-space-size=384" pm2 start npm --name strapi -- run start 2>&1 | tail -3
else
  echo "DIST MISSING - need full rebuild"
fi

echo ""
echo "=== 7. WAIT ==="
for i in $(seq 1 20); do
  sleep 4
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  echo "check $i: HTTP=$code"
  [ "$code" = "200" ] && break
done

echo ""
echo "=== 8. TEST ==="
curl -s http://127.0.0.1:1337/api/zhao-studio/platforms 2>&1 | head -c 500
echo ""
curl -s http://127.0.0.1:1337/api/zhao-studio/admin/schedules 2>&1 | head -c 500
echo ""
curl -s -X POST http://127.0.0.1:1337/api/zhao-studio/admin/publish/preview -H "Content-Type: application/json" -d '{"articleId":"test","accountIds":[]}' 2>&1 | head -c 500
echo ""

echo ""
echo "=== 9. LOGS ==="
tail -20 /home/admin/.pm2/logs/strapi-out.log
tail -10 /home/admin/.pm2/logs/strapi-error.log
