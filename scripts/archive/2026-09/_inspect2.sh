#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== third_party_configs 明细 ==='
SELECT id, provider, app_type, COALESCE(app_id,'') app_id, COALESCE(app_secret_last4,'') secret_last4, is_enabled, scope
FROM third_party_configs ORDER BY id;

\echo '=== zhao_site_configs 明细 ==='
SELECT id, COALESCE(name,'') name, COALESCE(url,'') url, extra_config
FROM zhao_site_configs ORDER BY id;

\echo '=== zhao_global_configs 明细 ==='
SELECT id, COALESCE(key,'') key, COALESCE(value,'') value
FROM zhao_global_configs ORDER BY id;

\echo '=== zhao_channel_platform_configs 明细 ==='
SELECT id, COALESCE(platform,'') platform, COALESCE(app_id,'') app_id, COALESCE(app_secret_last4,'') secret_last4, is_enabled
FROM zhao_channel_platform_configs ORDER BY id;

\echo '=== sso_quota_configs 明细 ==='
SELECT id, COALESCE(config_key,'') config_key, COALESCE(config_value,'') config_value
FROM sso_quota_configs ORDER BY id;
SQL
echo "DONE"