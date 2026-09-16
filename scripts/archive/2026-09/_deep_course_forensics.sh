#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
DB="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -t -A"
echo '=== 1. 库里是否存在 createdAt 很近的空主键占用痕迹(判断是否重建) ==='
$DB -c "SELECT setval(pg_get_serial_sequence('zhao_courses','id'), 
    (SELECT COALESCE(MAX(id),0)+1 FROM zhao_courses));" 2>/dev/null
echo '=== 序列当前值(若远超0说明曾插入过大量行) ==='
$DB -c "SELECT seqs.last_value, seqs.is_called FROM pg_sequences seqs WHERE seqname='zhao_courses_id_seq'" 2>/dev/null
ls /www/apps/strapi/*.log 2>/dev/null
echo ''
echo '=== 2. strapi_zhao_schema_seeds / migrations 里是否有 course seed ==='
$DB -c "SELECT id, name FROM zhao_schema_seeds WHERE name ILIKE '%course%';"
echo ''
echo '=== 3. 1Panel 是否有 postgres 自动备份目录 ==='
ls -la /opt/1panel/backup/database/ 2>/dev/null | head
ls -la /opt/1panel/apps/postgresql/ 2>/dev/null | head
echo 'DONE'