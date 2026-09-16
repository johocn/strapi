#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== sso_users 数量与关键列（sso id 是否与 up_users 对齐) ==='
SELECT id, COALESCE(username,'') username, COALESCE(email,'') email, status, length(coalesce(password_hash,'')) pwd_len
FROM sso_users ORDER BY id;

\echo '=== up_users 数量 ==='
SELECT count(*) up_cnt, min(id) min_id, max(id) max_id FROM up_users;

\echo '=== sso_oauth_configs 行数 ==='
SELECT count(*) FROM sso_oauth_configs;

\echo '=== sso_oauth_configs 明细 ==='
SELECT id, provider, app_type, COALESCE(app_id,'') app_id, is_enabled, scope
FROM sso_oauth_configs ORDER BY id;

\echo '=== zhao_site_configs / 租户设置里是否有公众号 appid/secret 线索 ==='
\dt *config*

\echo '=== admin_users ==='
SELECT id, username, email, is_active, blocked FROM admin_users ORDER BY id;
SQL
echo "INSPECT_RC=$?"