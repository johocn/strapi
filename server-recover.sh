#!/bin/bash
cd /www/apps/strapi
echo "=== 当前 PM2 状态 ==="
pm2 list strapi --no-color 2>&1 | tail -5
echo ""
echo "=== 尝试重启 (不 build) ==="
# Strapi 有缓存的话可能能起来
NODE_OPTIONS="--max-old-space-size=512" pm2 restart strapi --update-env 2>&1 | tail -3
sleep 10
curl -s -o /dev/null -w 'HEALTH=%{http_code}\n' http://127.0.0.1:1337/_health 2>&1
echo ""
echo "=== 如果还不行 恢复 admin build ==="
ls -la node_modules/@strapi/admin/dist/server/server/build/index.html 2>&1
echo ""
echo "=== 尝试 npx strapi build:admin 只 build admin ==="
cd node_modules/@strapi/admin
NODE_OPTIONS="--max-old-space-size=512" npx vite build 2>&1 | tail -10
