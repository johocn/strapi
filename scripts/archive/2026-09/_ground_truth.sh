#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== 当前整行（权威视图） ==='
SELECT id, document_id, provider, app_type, app_id, '[' || app_secret || ']' AS app_secret_raw,
       is_enabled, raw_extra
FROM sso_oauth_configs,
LATERAL (SELECT extra_config::text AS raw_extra) x
WHERE provider='wechat';
SQL
echo 'DONE'