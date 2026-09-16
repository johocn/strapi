#!/bin/bash
set -eo pipefail
# 部署 zhao-website 邀请码埋点：服务器拉取 + 校验 dist + 重启 strapi
cd /www/apps/strapi
git pull origin main
echo "--- verify dist ---"
grep -c "invite-flow/track" plugins/zhao-website/dist/server/index.mjs | xargs echo "invite-flow/track 命中次数:"
echo "--- restart ---"
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
pm2 restart strapi
echo "DONE"