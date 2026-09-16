#!/bin/bash
cd /www/apps/strapi
BK=/home/admin/sso10_cleanup_$(date +%Y%m%d_%H%M%S)
mkdir -p "$BK"
echo "BACKUP_DIR=$BK"

docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT '=== sso10 子表引用(全部 _user_lnk where sso_user_id=10) ===' AS info;
SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%user_lnk' ORDER BY tablename;
"

docker exec 1Panel-postgresql-pIe0 bash -c "cd /tmp && for t in sso_auth_codes_user_lnk sso_follow_ups_customer_lnk sso_follow_ups_partner_lnk sso_invite_codes_creator_lnk sso_invite_usages_user_lnk sso_login_logs_user_lnk sso_msg_jobs_user_lnk sso_referral_relations_invitee_lnk sso_referral_relations_inviter_lnk sso_third_party_bindings_user_lnk sso_tokens_user_lnk sso_user_app_roles_user_lnk sso_user_profiles_user_lnk; do echo \"-- \$t sso10:\"; psql -U strapi -d strapi -t -c \"SELECT count(*) FROM \$t WHERE sso_user_id=10\" 2>/dev/null || echo n/a; done"

echo DONE