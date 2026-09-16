#!/bin/bash
cd /www/apps/strapi
PSQL="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
echo "===== 1. sso_users 最新 6 个 ====="
$PSQL -c "SELECT id, username, status, invite_code_used, invited_by FROM sso_users ORDER BY id DESC LIMIT 6;"
echo "===== 2. up_users 最新 6 个（对齐字段）====="
$PSQL -c "SELECT id, username, email, sso_id, nickname, invite_code FROM up_users ORDER BY id DESC LIMIT 6;"
echo "===== 3. sso_invite_codes 最新 8 个（本人专属码）====="
$PSQL -c "SELECT c.id, c.code, c.app_code, c.invite_type, c.is_active, l.sso_user_id AS owner FROM sso_invite_codes c LEFT JOIN sso_invite_codes_creator_lnk l ON l.sso_invite_code_id=c.id ORDER BY c.id DESC LIMIT 8;"
echo "===== 4. 分销关系 sso_referral_relations ====="
$PSQL -c "SELECT r.id, ic.code, inviter.sso_user_id AS inviter_id, invitee.sso_user_id AS invitee_id FROM sso_referral_relations r LEFT JOIN sso_referral_relations_inviter_lnk inviter ON inviter.sso_referral_relation_id=r.id LEFT JOIN sso_referral_relations_invitee_lnk invitee ON invitee.sso_referral_relation_id=r.id LEFT JOIN sso_referral_relations_invite_code_lnk ic ON ic.sso_referral_relation_id=r.id ORDER BY r.id DESC LIMIT 8;"
echo "===== 5. sso_invite_usages ====="
$PSQL -c "SELECT * FROM sso_invite_usages ORDER BY id DESC LIMIT 8;"
$PSQL -c "SELECT * FROM sso_invite_usages_invite_code_lnk ORDER BY 1 DESC LIMIT 8;"
$PSQL -c "SELECT * FROM sso_invite_usages_user_lnk ORDER BY 1 DESC LIMIT 8;"
echo "===== 6. sso 与 up 对齐核对（本人邀请码=creator_lnk 指向该用户的码）====="
$PSQL -c "SELECT s.id AS sso_id, s.username AS sso_user, s.invite_code_used, s.invited_by, up.sso_id AS up_ssoid, up.nickname, up.invite_code AS up_invite, ic.code AS own_invite FROM sso_users s LEFT JOIN up_users up ON up.id=s.id LEFT JOIN sso_invite_codes_creator_lnk cl ON cl.sso_user_id=s.id LEFT JOIN sso_invite_codes ic ON ic.id=cl.sso_invite_code_id WHERE s.id>=5 ORDER BY s.id;"
echo DONE