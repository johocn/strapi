#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== 是否有多个 node/strapi 进程 ==='
ps aux | grep -iE 'strapi|node.*server|node.*start' | grep -v grep | awk '{print $2, $11, $12, $13}'
echo ''
echo '=== pm2 进程列表 ==='
export PM2_HOME=/home/admin/.pm2
pm2 list 2>/dev/null | head -20
echo ''
echo '=== 最近是否有别的写库脚本残留 /tmp /home/admin ==='
ls -la --time-style=long-iso /tmp/*oauth* /tmp/*fix* /home/admin/*oauth* /home/admin/*fix* 2>/dev/null
echo 'DONE'