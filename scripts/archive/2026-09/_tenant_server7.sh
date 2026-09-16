#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== zhao_channels 结构 ==='
SELECT column_name FROM information_schema.columns WHERE table_name='zhao_channels' ORDER BY ordinal_position;

\echo '=== zhao_channels_sites_lnk 结构 ==='
SELECT column_name FROM information_schema.columns WHERE table_name='zhao_channels_sites_lnk' ORDER BY ordinal_position;

\echo '=== zhao_channels 所有行 ==='
SELECT * FROM zhao_channels ORDER BY id;
SQL
echo "DONE"