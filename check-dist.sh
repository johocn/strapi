#!/bin/bash
cd /www/apps/strapi

echo "=== initStudioQueues in dist ==="
grep -n "initStudioQueues" plugins/zhao-studio/dist/server/index.js | head -10

echo ""
echo "=== context around line 29386 ==="
sed -n '29380,29400p' plugins/zhao-studio/dist/server/index.js

echo ""
echo "=== return null grep ==="
grep -n "publish: null" plugins/zhao-studio/dist/server/index.js | head -5

echo ""
echo "=== pm2 current ==="
pm2 list strapi --no-color 2>&1 | tail -2
curl -s -o /dev/null -w 'HEALTH=%{http_code}' http://127.0.0.1:1337/_health
echo ""
