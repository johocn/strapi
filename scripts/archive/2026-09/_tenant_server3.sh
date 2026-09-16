#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== zhao_site_configs 全部（干净） ==='
SELECT id, document_id, site_name, COALESCE(domain,'') domain, COALESCE(channel_usage,'') channel_usage, created_at, updated_at
FROM zhao_site_configs ORDER BY id;

\echo '=== 可能承载"租户/站点"的 content-type（找单数表，非 *_lnk / _site_lnk） ==='
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND table_name NOT LIKE '%\_lnk' AND table_name NOT LIKE '%\_site\_lnk'
  AND (table_name ILIKE '%site%' OR table_name ILIKE '%tenant%' OR table_name ILIKE '%app%')
ORDER BY table_name;
SQL
echo "DONE"