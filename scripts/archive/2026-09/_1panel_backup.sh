#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== 1Panel postgresql 备份目录结构 ==='
find /opt/1panel/backup/database/postgresql/ -maxdepth 4 2>/dev/null | head -40
echo ''
echo '=== 是否有课程相关数据库备份(dump/sql/custom) ==='
find /opt/1panel/backup/database/postgresql/ -type f \( -name '*.gz' -o -name '*.sql' -o -name '*.dump' -o -name '*.backup' -o -name '*.tar' \) 2>/dev/null | head -20
echo ''
echo '=== 序列对象真相 ==='
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
SELECT c.relname, s.last_value, s.is_called
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_sequences s ON s.schemaname=n.nspname AND s.seqname=c.relname
WHERE c.relname IN ('zhao_courses_id_seq','zhao_courses_ltree','zhao_courses')
ORDER BY c.relname;
SELECT column_default FROM information_schema.columns WHERE table_name='zhao_courses' AND column_name='id';
SQL
echo 'DONE'