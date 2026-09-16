#!/bin/bash
cd /www/apps/strapi
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT '--- lnk tables ---' AS info;
SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%third_party%' OR table_name LIKE '%binding%' ORDER BY table_name;
"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT '--- bind->sso lnk ---' AS info;
SELECT * FROM sso_third_party_bindings_sso_user_lnk ORDER BY 1;
"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT '--- sso 10/12/13 profile ---' AS info;
SELECT id, username, COALESCE(nickname,'') nickname, register_channel, created_at::text created_at FROM sso_users WHERE id IN (10,12,13) ORDER BY id;
"
echo DONE