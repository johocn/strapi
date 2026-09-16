#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== config 目录文件 ==='
ls -la /www/apps/strapi/config/
echo ''
echo '=== pm2 启动命令（是 start 还是 develop?）==='
export PM2_HOME=/home/admin/.pm2
pm2 describe strapi 2>/dev/null | grep -iE 'script args|exec cwd|node args|created' | head
pm2 env 1 2>/dev/null | grep -iE 'NODE_ENV|ts-node|register' | head
echo ''
echo '=== package.json scripts 与 main ==='
grep -nE '"name"|"main"|"start"|"develop"|"strapi"|"dev"' /www/apps/strapi/package.json | head
echo 'DONE'