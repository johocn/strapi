#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== .env 是否有 SSO_DEFAULT_APP_SECRET ==='
grep -c '^SSO_DEFAULT_APP_SECRET=' /www/apps/strapi/.env
grep -c '^SSO_DEFAULT_APP_SECRET=' /www/apps/strapi/.env.production 2>/dev/null
echo '=== 当前 sso_apps redirect_uris 快照 ==='
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
SELECT id, app_code,
       round(hashes.app_secret_len) AS app_secret_len,
       redirect_uris
FROM sso_apps,
LATERAL (SELECT length(app_secret) AS app_secret_len) hashes
ORDER BY id;
SQL
echo 'DONE'