#!/bin/bash
# 清理清空后被遗留的孤儿父实体（其 user-link 已随用户删除）
# DRY=1 打印计划；DRY=0 执行
set -euo pipefail
DRY="${DRY:-1}"
PSQL="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"

echo "===== 孤儿父实体清理 [DRY=$DRY] $(date +%Y%m%d_%H%M%S) ====="
if [ "$DRY" = "0" ]; then
  $PSQL <<'SQL'
BEGIN;
DELETE FROM sso_auth_codes
  WHERE NOT EXISTS (SELECT 1 FROM sso_auth_codes_user_lnk l WHERE l.sso_auth_code_id = sso_auth_codes.id);
DELETE FROM sso_tokens
  WHERE NOT EXISTS (SELECT 1 FROM sso_tokens_user_lnk l WHERE l.sso_token_id = sso_tokens.id);
DELETE FROM sso_login_logs
  WHERE NOT EXISTS (SELECT 1 FROM sso_login_logs_user_lnk l WHERE l.sso_login_log_id = sso_login_logs.id);
DELETE FROM sso_third_party_bindings
  WHERE NOT EXISTS (SELECT 1 FROM sso_third_party_bindings_user_lnk l WHERE l.sso_third_party_binding_id = sso_third_party_bindings.id);
DELETE FROM sso_user_profiles
  WHERE NOT EXISTS (SELECT 1 FROM sso_user_profiles_user_lnk l WHERE l.sso_user_profile_id = sso_user_profiles.id);
DELETE FROM sso_invite_codes
  WHERE NOT EXISTS (
    SELECT 1 FROM sso_invite_codes_creator_lnk c WHERE c.sso_invite_code_id = sso_invite_codes.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM sso_invite_stats_invite_code_lnk s WHERE s.sso_invite_code_id = sso_invite_codes.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM sso_invite_usages_invite_code_lnk u WHERE u.sso_invite_code_id = sso_invite_codes.id
  );
DELETE FROM activity_signups
  WHERE NOT EXISTS (SELECT 1 FROM activity_signups_user_lnk l WHERE l.activity_signup_id = activity_signups.id);
COMMIT;
SQL
else
  $PSQL <<'SQL'
SELECT 'sso_auth_codes' t, count(*) FROM sso_auth_codes WHERE NOT EXISTS (SELECT 1 FROM sso_auth_codes_user_lnk l WHERE l.sso_auth_code_id = sso_auth_codes.id)
UNION ALL SELECT 'sso_tokens', count(*) FROM sso_tokens WHERE NOT EXISTS (SELECT 1 FROM sso_tokens_user_lnk l WHERE l.sso_token_id = sso_tokens.id)
UNION ALL SELECT 'sso_login_logs', count(*) FROM sso_login_logs WHERE NOT EXISTS (SELECT 1 FROM sso_login_logs_user_lnk l WHERE l.sso_login_log_id = sso_login_logs.id)
UNION ALL SELECT 'sso_third_party_bindings', count(*) FROM sso_third_party_bindings WHERE NOT EXISTS (SELECT 1 FROM sso_third_party_bindings_user_lnk l WHERE l.sso_third_party_binding_id = sso_third_party_bindings.id)
UNION ALL SELECT 'sso_user_profiles', count(*) FROM sso_user_profiles WHERE NOT EXISTS (SELECT 1 FROM sso_user_profiles_user_lnk l WHERE l.sso_user_profile_id = sso_user_profiles.id)
UNION ALL SELECT 'sso_invite_codes', count(*) FROM sso_invite_codes WHERE NOT EXISTS (SELECT 1 FROM sso_invite_codes_creator_lnk c WHERE c.sso_invite_code_id = sso_invite_codes.id) AND NOT EXISTS (SELECT 1 FROM sso_invite_stats_invite_code_lnk s WHERE s.sso_invite_code_id = sso_invite_codes.id) AND NOT EXISTS (SELECT 1 FROM sso_invite_usages_invite_code_lnk u WHERE u.sso_invite_code_id = sso_invite_codes.id)
UNION ALL SELECT 'activity_signups', count(*) FROM activity_signups WHERE NOT EXISTS (SELECT 1 FROM activity_signups_user_lnk l WHERE l.activity_signup_id = activity_signups.id);
SQL
fi
echo "DONE"