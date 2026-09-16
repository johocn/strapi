#!/bin/bash
# 部署 zhao-website 插件：git pull 拉到新 dist + pm2 重启 strapi
set -e
cd /www/apps/strapi
echo "=== before: $(git log --oneline -1) ==="
git pull origin main
echo "=== after: $(git log --oneline -1) ==="
# 校验新 dist 已落地
if grep -rq "truthBasisSections" plugins/zhao-website/dist/server; then
  echo "DIST_CHECK_OK"
else
  echo "DIST_CHECK_FAIL" >&2
  exit 1
fi
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
pm2 restart strapi >/dev/null 2>&1 && echo "PM2_RESTART_OK"
echo "DONE"
