#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== ① pm2 strapi 日志：13:00 前后启动/restart 记录 ==='
find /home/admin/.pm2/logs -name '*.log' -newermt '2026-09-03 12:00' 2>/dev/null | head
for f in $(find /home/admin/.pm2/logs -name 'strapi*.log' 2>/dev/null); do
  echo "----- $f -----"
  grep -nE '13:0[0-9]|bootstrap|seed|BOOTSTRAP|Creating default|site-config|tenant' "$f" 2>/dev/null | tail -30
done

echo '=== ② strapi pm2 重启时间线 ==='
export PM2_HOME=/home/admin/.pm2
/usr/bin/env node /home/admin/.nvm/versions/node/v22.23.1/bin/pm2 jlist 2>/dev/null >/dev/null; pm2 describe strapi 2>/dev/null | grep -iE 'restarts|uptime|created|status' | head

echo '=== ③ 系统启动/重启时间 ==='
uptime
who -b 2>/dev/null