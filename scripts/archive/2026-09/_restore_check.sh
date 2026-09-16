#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== 恢复后 zhao_site_configs ==='
SELECT id, document_id, site_name, COALESCE(domain,'') domain FROM zhao_site_configs ORDER BY id;

\echo '=== 现库 zhao_channels_sites_lnk 现状 ==='
SELECT * FROM zhao_channels_sites_lnk ORDER BY id;

\echo '=== 现库 zhao_site_configs_template_lnk 现状 ==='
SELECT * FROM zhao_site_configs_template_lnk ORDER BY id;

\echo '=== 备份中 template 关联目标（site_config_id→site_template_id） ==='
SQL
echo "DONE"