#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== 找逻辑全库备份 .jsonl.gz ==='
find /home/admin /tmp /www /root /mnt /data -maxdepth 5 -iname '*jsonl.gz' -o -maxdepth 5 -iname 'strapi_logical_backup*' 2>/dev/null | head -40
echo '=== 所有 .gz / .dump 备份文件(全盘关键目录) ==='
find /home/admin /tmp /root /www /opt/1panel -maxdepth 6 \( -iname '*.dump' -o -iname '*.jsonl.gz' -o -iname '*backup*.gz' -o -iname '*backup*.sql' \) 2>/dev/null | head -60
echo '=== sso_backup dump 头部(看备份了什么) ==='
head -40 /tmp/sso_backup/sso_backup_20260903_161128.dump 2>/dev/null
echo '=== 看是否逻辑备份脚本生成过日志 ==='
ls -la --time-style=long-iso /home/admin/*.jsonl* /home/admin/strapi_logical_backup* 2>/dev/null