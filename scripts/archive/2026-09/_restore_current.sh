#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== 现库 zhao_site_configs ==='
SELECT id, document_id, site_name, COALESCE(domain,'') domain FROM zhao_site_configs ORDER BY id;

\echo '=== 现库 zhao_site_configs_template_lnk ==='
SELECT * FROM zhao_site_configs_template_lnk ORDER BY id;

\echo '=== 现库 zhao_channels_sites_lnk ==='
SELECT * FROM zhao_channels_sites_lnk ORDER BY id;

\echo '=== 现库 zhao_channels (id 与 code) ==='
SELECT id, document_id, name, code, channel_tier, COALESCE(site_id::text,'') site_id FROM zhao_channels ORDER BY id LIMIT 10;

\echo '=== 现库 zhao_site_templates ==='
SELECT id, document_id, name, "isDefault" FROM zhao_site_templates ORDER BY id;

\echo '=== zhao_site_configs 列清单 ==='
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='zhao_site_configs' ORDER BY ordinal_position;
SQL
echo "DONE"