#!/bin/bash
set -o pipefail
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"; source "$NVM_DIR/nvm.sh"

echo "================================================"
echo " BullMQ v5 Deployment"
echo "================================================"

# 1. Pull + 停服务
echo ""
echo "=== 1. Pull + stop ==="
git pull 2>&1 | tail -3
pm2 stop strapi vendure vendure-worker nshop 2>/dev/null
sleep 3
free -m | awk 'NR==2 {print "available="$7"MB"}'

# 2. 替换依赖
echo ""
echo "=== 2. npm install ==="
npm uninstall bull 2>&1 | tail -2
npm install bullmq@5.81.5 2>&1 | tail -3
node -e "try { require('bullmq'); console.log('bullmq OK v'+require('bullmq/package.json').version) } catch(e) { console.log('bullmq FAIL:', e.message); exit 1 }"
node -e "try { require('bull'); console.log('bull still present') } catch(e) { console.log('bull removed OK') }"

# 3. Build plugin
echo ""
echo "=== 3. Build plugin ==="
SDK=$(ls -d ~/.npm/_npx/*/node_modules/@strapi/sdk-plugin 2>/dev/null | head -1)
cd plugins/zhao-studio
rm -rf dist
NODE_OPTIONS="--max-old-space-size=800" timeout 300 node "$SDK/bin/strapi-plugin.js" build 2>&1 | tail -8
cd /www/apps/strapi

# 4. 验证 dist 关键内容
echo ""
echo "=== 4. Verify dist ==="
[ -f "plugins/zhao-studio/dist/server/index.js" ] && echo "✅ dist/server/index.js exists" || { echo "❌ dist missing"; exit 1; }
grep -q "from 'bullmq'" plugins/zhao-studio/dist/server/index.js && echo "✅ bullmq import in dist" || echo "❌ bullmq NOT in dist"
grep -q "new Worker" plugins/zhao-studio/dist/server/index.js && echo "✅ Worker constructor in dist" || echo "❌ Worker NOT in dist"
grep -q "studio-publish" plugins/zhao-studio/dist/server/index.js && echo "✅ studio-publish queue name in dist" || echo "❌ queue name missing"

# 5. Start strapi
echo ""
echo "=== 5. Start strapi ==="
rm -f /home/admin/.pm2/logs/strapi-*.log
NODE_OPTIONS="--max-old-space-size=500" pm2 start npm --name strapi -- run start 2>&1 | tail -3

# 6. Wait for health
echo ""
echo "=== 6. Wait for health ==="
UP=0
for i in $(seq 1 50); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health 2>/dev/null)
  [ "$code" = "200" ] || [ "$code" = "204" ] && { echo "UP at check $i (HTTP=$code)"; UP=1; break; }
  [ $((i % 5)) -eq 0 ] && echo "check $i: HTTP=$code"
done
[ "$UP" = "1" ] && echo "✅ Health check passed" || { echo "❌ Health check failed"; tail -30 /home/admin/.pm2/logs/strapi-error.log; exit 1; }

# 7. 关键：检查 BullMQ 是否活起来（看 log）
echo ""
echo "=== 7. BullMQ Worker Registration Check ==="
sleep 3
echo "--- grep BullMQ from out log ---"
grep -i "bullmq\|publish worker\|scheduler worker\|BullMQ\|studio-publish\|studio-scheduler" /home/admin/.pm2/logs/strapi-out.log 2>/dev/null | tail -10 || echo "(no match yet)"

echo ""
echo "--- grep Redis connection errors ---"
grep -i "bullmq.*error\|queue.*error\|redis.*fail" /home/admin/.pm2/logs/strapi-error.log 2>/dev/null | tail -5 || echo "(no error)"

# 8. Redis 里验证队列存在
echo ""
echo "=== 8. Redis queue check ==="
REDIS_PASS="Joho@963963"
redis-cli -a "$REDIS_PASS" --no-auth-warning KEYS "bull:*" 2>&1
redis-cli -a "$REDIS_PASS" --no-auth-warning KEYS "bull:studio-*" 2>&1

# 9. 基础 API 测试
echo ""
echo "=== 9. API smoke test ==="
LOGIN=$(curl -s -X POST http://127.0.0.1:1337/api/auth/local -H "Content-Type: application/json" -d '{"identifier":"zhao","password":"a963963"}')
JWT=$(echo "$LOGIN" | grep -o '"jwt":"[^"]*"' | cut -d'"' -f4)
AUTH="Authorization: Bearer $JWT"
for ep in "/v1/admin/platforms" "/v1/admin/schedules" "/v1/admin/records"; do
  R=$(curl -s -w '\n%{http_code}' "http://127.0.0.1:1337/api/zhao-studio$ep" -H "$AUTH")
  CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | sed '$d' | head -c 100)
  [ "$CODE" = "200" ] && echo "✅ $ep → 200 | $BODY" || echo "❌ $ep → $CODE"
done

# 10. 恢复其他 PM2
echo ""
echo "=== 10. Restore other apps ==="
pm2 restart vendure nshop 2>/dev/null
sleep 2
pm2 list --no-color 2>&1 | tail -4

echo ""
echo "================================================"
echo " DONE"
echo "================================================"
