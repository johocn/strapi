#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== third_party_configs 全部数据（含 app_secret 长度掩码） ==='
SELECT id, name, platform, app_type, app_id, length(coalesce(app_secret,'')) as secret_len, enabled
FROM third_party_configs ORDER BY id;

\echo '=== zhao_site_configs：非空核心字段 ==='
SELECT id, site_name, domain FROM zhao_site_configs ORDER BY id;

\echo '=== zhao_global_configs ==='
SELECT id, jsonb_pretty(module_enabled) module_enabled FROM zhao_global_configs ORDER BY id;
SQL
echo "DONE"