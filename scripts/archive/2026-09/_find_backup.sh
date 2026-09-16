#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== 找数据库 dump / 备份文件 ==='
find /tmp /root /home/admin /www -maxdepth 4 \( -iname '*.dump' -o -iname '*.sql' -o -iname '*.backup' -o -iname '*pg_dump*' -o -iname '*backup*' \) 2>/dev/null | head -50
echo '=== 1Panel 备份目录 ==='
ls -la /opt/1panel/backups 2>/dev/null
find /opt/1panel -maxdepth 5 -iname '*dump*' -o -maxdepth 5 -iname '*.sql' 2>/dev/null | head -40
echo '=== observation 结束 ==='