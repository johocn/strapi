#!/bin/bash
cd /www/apps/strapi
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT '--- bindings columns ---' AS info;
SELECT column_name FROM information_schema.columns WHERE table_name='sso_third_party_bindings' ORDER BY ordinal_position;
"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT '--- bindings ---' AS info;
SELECT * FROM sso_third_party_bindings ORDER BY id;
"
echo DONE