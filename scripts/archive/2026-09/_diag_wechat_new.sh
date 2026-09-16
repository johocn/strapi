#!/bin/bash
cd /www/apps/strapi
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT '--- latest sso_users ---' AS info;
SELECT id, username, COALESCE(nickname,'') nickname, register_channel FROM sso_users ORDER BY id DESC LIMIT 6;
SELECT '--- up_users with sso_id ---' AS info;
SELECT id, username, COALESCE(nickname,'') nickname, sso_id, invite_code FROM up_users WHERE sso_id IS NOT NULL OR id>=10 ORDER BY id;
SELECT '--- third_party_bindings ---' AS info;
SELECT id, user_id, provider, COALESCE(openid,'') openid, COALESCE(unionid,'') unionid, COALESCE(provider_nickname,'') nickname, created_at::text created_at FROM sso_third_party_bindings ORDER BY id;
SELECT '--- sso 10 detail ---' AS info;
SELECT id, username, COALESCE(nickname,'') nickname, register_channel, created_at::text created_at FROM sso_users WHERE id=10;
"
echo DONE