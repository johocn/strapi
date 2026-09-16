#!/bin/bash
cd /www/apps/strapi
echo "=== bindings unionid (含新授权 14/15) ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT b.id, b.provider_user_id,
       COALESCE(b.provider_union_id,'<NULL>') AS col_unionid,
       COALESCE(b.provider_data::jsonb->>'unionid','<NULL>') AS data_unionid,
       b.provider_nickname,
       (SELECT sso_user_id FROM sso_third_party_bindings_user_lnk l WHERE l.sso_third_party_binding_id=b.id) AS sso_user
FROM sso_third_party_bindings b ORDER BY b.id DESC LIMIT 8;"
echo "=== sso_users.id 14/15 ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT id, username, nickname, register_channel, invite_code_used,
       COALESCE(uuid,'') AS uuid FROM sso_users WHERE id IN (14,15) ORDER BY id;"
echo "=== 邀请码 creator 归属 ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT c.id, c.code, l.sso_user_id FROM sso_invite_codes c
LEFT JOIN sso_invite_codes_creator_lnk l ON l.sso_invite_code_id=c.id
WHERE c.id IN (4,5) ORDER BY c.id;"
echo "=== up_users 14/15 是否有 invite/sso 字段 ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT column_name FROM information_schema.columns WHERE table_name='up_users' AND column_name IN ('invite_code','sso_id','nickname','avatar') ORDER BY column_name;"
echo "=== up_users 14/15 数据 ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT id, username, provider, invite_code, sso_id, nickname, avatar FROM up_users WHERE id IN (14,15) ORDER BY id;"
echo DONE