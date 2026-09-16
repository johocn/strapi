#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== zhao-common site-config 内容类型表名确认 ==='
SELECT table_name FROM information_schema.tables WHERE table_schema='public'
  AND (table_name LIKE '%site_config%' OR table_name='sites')
ORDER BY table_name;

\echo '=== zhao_channels（渠道/站点 真实数据） ==='
SELECT id, document_id, COALESCE(name,'') name, COALESCE(site_name,'') site_name, COALESCE(domain,'') domain, COALESCE(code,'') code, is_active, created_at, deleted_at
FROM zhao_channels ORDER BY id;
SQL
echo "DONE"