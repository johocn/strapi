#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
SELECT id, app_code, app_name, is_active, allowed_grant_types, redirect_uris FROM sso_apps ORDER BY id;
SQL
echo 'DONE'