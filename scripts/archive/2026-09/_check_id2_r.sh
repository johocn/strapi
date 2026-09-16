#!/bin/bash
set -euo pipefail
echo "===== sso_referral_relations 表结构 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='sso_referral_relations'"
echo ""
echo "===== sso_referral_relations 全表 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_referral_relations"
echo ""
echo "===== id=2 关联表汇总 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT 'sso_tokens_user_lnk' t, count(*) n FROM sso_tokens_user_lnk WHERE sso_user_id=2
UNION ALL SELECT 'sso_auth_codes_user_lnk', count(*) FROM sso_auth_codes_user_lnk WHERE sso_user_id=2
UNION ALL SELECT 'sso_third_party_bindings_user_lnk', count(*) FROM sso_third_party_bindings_user_lnk WHERE sso_user_id=2
UNION ALL SELECT 'sso_user_profiles_user_lnk', count(*) FROM sso_user_profiles_user_lnk WHERE sso_user_id=2
UNION ALL SELECT 'sso_login_logs_user_lnk', count(*) FROM sso_login_logs_user_lnk WHERE sso_user_id=2
UNION ALL SELECT 'sso_invite_codes_creator_lnk', count(*) FROM sso_invite_codes_creator_lnk WHERE sso_user_id=2
UNION ALL SELECT 'zhao_user_invites_user_lnk', count(*) FROM zhao_user_invites_user_lnk WHERE user_id=2;"
echo ""
echo "===== id=2 自有邀请码 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT c.code, c.is_active, c.type
FROM sso_invite_codes c
WHERE EXISTS (SELECT 1 FROM sso_invite_codes_creator_lnk l WHERE l.sso_invite_code_id=c.id AND l.sso_user_id=2);"
echo ""
echo "===== up_users 全部字段 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM up_users WHERE id=2;"
echo ""
echo "===== sso_referral_relations 中涉及 user=2 的行 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_referral_relations WHERE inviter=2 OR invitee=2;"