#!/bin/bash
set -e
cd /www/apps/strapi
echo "=== before: $(git log --oneline -1) ==="
git pull origin main
echo "=== after: $(git log --oneline -1) ==="
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
pm2 restart strapi >/dev/null 2>&1 && echo "PM2_RESTART_OK"
echo "DONE"