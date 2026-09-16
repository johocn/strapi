#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
echo '=== strapi 监听端口 ==='
ss -ltnp 2>/dev/null | grep -iE 'node|1337|addr' | head -20
echo '=== .env PORT ==='
grep -iE '^(PORT|HOST|APP_KEYS)' /www/apps/strapi/.env 2>/dev/null | sed 's/=.*/=***/' 
echo '=== pm2 strapi 环境 PORT ==='
pm2 env 1 2>/dev/null | grep -iE '^PORT|^HOST' | sed 's/=.*/=***/'
echo 'DONE'