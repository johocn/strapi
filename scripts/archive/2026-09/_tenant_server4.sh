#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== sso_apps 全部 ==='
SELECT * FROM sso_apps ORDER BY id;

\echo '=== sso_apps 结构 ==='
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='sso_apps' ORDER BY ordinal_position;
SQL
echo "DONE"