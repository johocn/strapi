#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

# 停 vendure-worker 释放内存
pm2 stop vendure-worker 2>/dev/null
pm2 delete strapi 2>/dev/null

# 清理残留
kill $(pgrep -f "strapi start") 2>/dev/null || true
sleep 2

free -m

# start
NODE_OPTIONS="--max-old-space-size=600" pm2 start npm --name strapi -- run start 2>&1
sleep 5
pm2 list strapi --no-color 2>&1 | tail -3
