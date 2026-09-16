#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== sso_apps 全表（重点 redirect_uris, is_active, app_code）==='
SELECT id, app_code, app_name, is_active, allowed_grant_types,
       array_agg(redirect_uri ORDER BY redirect_id) AS redirect_uris
FROM (SELECT a.*, r.redirect_uri, r.id AS redirect_id
      FROM sso_apps a LEFT JOIN sso_apps_redirect_uris_lnk l ON a.id=l.app_id
      LEFT JOIN sso_redirect_uris r ON r.id=l.redirect_uri_id) t
GROUP BY id, app_code, app_name, is_active, allowed_grant_types
ORDER BY id;
SQL
echo 'DONE'