#!/bin/bash
set -euo pipefail
# 在 strapi 应用目录拉取最新的 zhao-sso 修复并重启
cd /www/apps/strapi
git pull origin main
echo "--- verify dist ---"
grep -c "plugin::zhao-sso.sso-invite-code" plugins/zhao-sso/dist/server/index.mjs || echo "FAIL: dist 未更新"
grep -q "creator: ssoUserId" plugins/zhao-sso/dist/server/index.mjs && echo "OK: 三码统一逻辑已进 dist" || echo "FAIL"
echo "--- restart ---"
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
pm2 restart strapi
echo "DONE"