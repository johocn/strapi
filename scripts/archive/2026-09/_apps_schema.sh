#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== 相关表名 ==='
SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%app%redirect%' OR table_name ILIKE 'sso_apps%' OR table_name ILIKE '%redirect_uri%';
\echo '=== sso_apps 列 ==='
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='sso_apps' ORDER BY ordinal_position;
SQL
echo 'DONE'