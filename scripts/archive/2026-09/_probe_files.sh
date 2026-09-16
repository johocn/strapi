#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== /home/admin/_db_backup.cjs (备份脚本) ==='
cat /home/admin/_db_backup.cjs 2>/dev/null | head -80
echo ''
echo '=== 所有 /home/admin 与 /tmp 下文件的修改时间 ==='
ls -la --time-style=long-iso /home/admin/*.sql /home/admin/*.cjs /tmp/*.sql /tmp/prod-*.sql /tmp/sso_backup/* 2>/dev/null
echo '=== basic_ws_backup_20260830 内容 ==='
ls -la --time-style=long-iso /home/admin/basic_ws_backup_20260830 2>/dev/null | head -40