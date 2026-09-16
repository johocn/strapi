#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== 1. zhao_site_configs 全表（租户/站点） ==='
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
SELECT id, document_id, site_name, domain, extra_config->>'authMode' AS auth_mode
FROM zhao_site_configs ORDER BY id;
SQL
echo ''
echo '=== 2. 与首页/页面相关的表名 ==='
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
SELECT table_name FROM information_schema.tables
WHERE table_name ILIKE '%home%' OR table_name ILIKE '%page%' OR table_name ILIKE '%menu%'
OR table_name ILIKE '%website%' OR table_name ILIKE '%banner%' OR table_name ILIKE '%module%'
ORDER BY table_name;
SQL
echo 'DONE'