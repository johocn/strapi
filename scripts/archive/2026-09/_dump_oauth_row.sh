#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== sso_oauth_configs 全行 ==='
SELECT id, provider, app_type, app_id, app_secret, is_enabled, scope, extra_config,
       COALESCE(description,'') description, created_at, updated_at
FROM sso_oauth_configs ORDER BY id;
\echo '=== 是否有草稿/重复 wechat official_account 行 ==='
SELECT id, document_id, provider, app_type, app_id, is_enabled, status FROM sso_oauth_configs WHERE provider='wechat';
SQL
echo 'DONE'