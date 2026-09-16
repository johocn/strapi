#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== ① 13:00:06 shutdown 前 10 行（谁触发重启） ==='
grep -n '2026-09-03 12:' /home/admin/.pm2/logs/strapi-out.log | tail -15
echo ''
echo '=== ② 13:00 shutdown 前后完整上下文 ==='
grep -nE 'Shutting down Strapi|strapped|Server listen|has been shut|修复|clear|delete|TRUNCATE|DROP|site' /home/admin/.pm2/logs/strapi-out.log | awk -F: '$1>=38590 && $1<=38620' | head -40
echo ''
echo '=== ③ bash history：最近执行的 sql/迁移命令 ==='
tail -80 /home/admin/.bash_history 2>/dev/null | grep -iE 'sql|psql|docker|site|truncate|delete|migrat|seed|backup' | tail -40
echo ''
echo '=== ④ 本地sso_migrate是否有任何 zhao_site 相关 ==='
find /tmp /home/admin -maxdepth 3 -iname '*migrat*' -o -iname '*sso*sh' -o -iname '_sso*' 2>/dev/null | head