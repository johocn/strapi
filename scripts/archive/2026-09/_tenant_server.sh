#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== 含 tenant/org/company/site 表 ==='
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND (table_name ILIKE '%tenant%' OR table_name ILIKE '%org%' OR table_name ILIKE '%company%' OR table_name ILIKE '%site%' OR table_name ILIKE '%租户%')
ORDER BY table_name;

\echo '=== sso_user 是否分租户 / role 枚举 ==='
SELECT id, COALESCE(role,'') role FROM sso_users ORDER BY id;
SQL
echo "DONE"