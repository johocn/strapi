#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== 现库 zhao_channels ==='
SELECT id, document_id, name, code, channel_tier, COALESCE(status::text,'') status FROM zhao_channels ORDER BY id;

\echo '=== 现库 zhao_site_templates ==='
SELECT id, document_id, name, is_default FROM zhao_site_templates ORDER BY id;

\echo '=== 现库 zhao_channels_sites_lnk 关联列名 ==='
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='zhao_channels_sites_lnk' ORDER BY ordinal_position;
SQL
echo "DONE"