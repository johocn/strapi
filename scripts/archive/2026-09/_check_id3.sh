#!/bin/bash
set -eo pipefail

echo "===== [1] sso_users / up_users (id=3) ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -tAc "SELECT 'sso_users', id, COALESCE(username,''), COALESCE(uuid,''), COALESCE(invite_code_used,''), COALESCE(invited_by::text,'') FROM sso_users WHERE id=3"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -tAc "SELECT 'up_users', id, COALESCE(username,''), COALESCE(email,''), COALESCE(invite_code,'') FROM up_users WHERE id=3"

echo ""
echo "===== [2] 三码核验 (id=3) ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -tAc "SELECT 'sso_own_code', code FROM sso_invite_codes WHERE EXISTS(SELECT 1 FROM sso_invite_codes_creator_lnk l WHERE l.sso_invite_code_id=sso_invite_codes.id AND l.sso_user_id=3)"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -tAc "SELECT 'zhao_user_invites', ui.invite_code FROM zhao_user_invites ui JOIN zhao_user_invites_user_lnk l ON l.user_invite_id=ui.id WHERE l.user_id=3"

echo ""
echo "===== [3] 分销关系 (id=3 作为邀请人或被邀请人) ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_referral_relations WHERE inviter=3 OR invitee=3"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_invite_usages WHERE inviter_id=3 OR invitee_id=3"

echo ""
echo "===== [4] sso_users 全表概览 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT id, COALESCE(username,'') AS username, COALESCE(invite_code_used,'') AS code_used, COALESCE(invited_by::text,'') AS invited_by, register_channel FROM sso_users ORDER BY id"

echo ""
echo "===== [5] sso_invite_codes 全表 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT c.id, c.code, l.sso_user_id AS owner, c.invite_type, c.use_count, c.is_active FROM sso_invite_codes c LEFT JOIN sso_invite_codes_creator_lnk l ON l.sso_invite_code_id=c.id ORDER BY c.id"