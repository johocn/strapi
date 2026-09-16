#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== third_party_configs 结构 ==='
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='third_party_configs' ORDER BY ordinal_position;

\echo '=== zhao_site_configs 结构 ==='
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='zhao_site_configs' ORDER BY ordinal_position;

\echo '=== zhao_global_configs 结构 ==='
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='zhao_global_configs' ORDER BY ordinal_position;

\echo '=== zhao_channel_platform_configs 结构 ==='
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='zhao_channel_platform_configs' ORDER BY ordinal_position;
SQL
echo "DONE"