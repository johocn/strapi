#!/bin/bash
cd /www/apps/strapi
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT '--- bind->sso_user lnk ---' AS info;
SELECT * FROM sso_third_party_bindings_user_lnk ORDER BY 1;
"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT '--- bind->sso: openid + sso match ---' AS info;
SELECT b.id bind_id, LEFT(b.provider_user_id,20) openid, COALESCE(b.provider_nickname,'') nick,
       su.id sso_id, su.username
FROM sso_third_party_bindings b
LEFT JOIN sso_third_party_bindings_user_lnk lnk ON lnk.sso_third_party_binding_id=b.id
LEFT JOIN sso_users su ON su.id=lnk.user_id
ORDER BY b.id;
"
echo DONE