#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
DB="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -t -A"
echo '=== zhao_courses_id_seq 真实值 ==='
$DB -c "SELECT last_value, is_called FROM zhao_courses_id_seq;" 2>&1
echo ''
echo '=== 全盘搜数据库备份文件(限相关目录,避免扫全盘) ==='
find /home/admin /opt /www /root /backup /var/backups -type f \( -name '*.sql' -o -name '*.jsonl.gz' -o -name '*.dump' -o -name '*.backup' -o -name '*.tar.gz' \) 2>/dev/null | grep -viE 'node_modules|\.git' | head -40
echo ''
echo '=== strapi_database_schema 是否记录 zhao_courses 结构变更历史(反应表曾有的列) ==='
$DB -c "SELECT COUNT(*) FROM strapi_database_schema;" -t -A
echo '=== 是否有 zhao_schema_migrations / zhao_schema_seeds 全量 ==='
$DB -c "SELECT COUNT(*) FROM zhao_schema_migrations;" -t -A
$DB -c "SELECT COUNT(*) FROM zhao_schema_seeds;" -t -A
echo 'DONE'