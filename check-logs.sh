#!/bin/bash
echo "=== FULL OUT LOG ==="
cat /home/admin/.pm2/logs/strapi-out.log 2>/dev/null | tail -50
echo ""
echo "=== FULL ERR LOG ==="
cat /home/admin/.pm2/logs/strapi-error.log 2>/dev/null | tail -20
echo ""
echo "=== pm2 status ==="
pm2 list strapi --no-color 2>/dev/null | tail -5
echo ""
echo "=== last dist ==="
ls -la /www/apps/strapi/plugins/zhao-studio/dist/server/index.js
grep -c "publish: null" /www/apps/strapi/plugins/zhao-studio/dist/server/index.js
