#!/bin/bash
# 逐条删除演示用户 id=4 的关联（非事务，每条独立，定位失败并继续）
set -u
UID4=4
run() { echo "--- $1"; docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -v ON_ERROR_STOP=0 -P pager=off -c "$2" 2>&1 | sed 's/^/   /'; }

run "auth lnk"        "DELETE FROM sso_auth_codes_user_lnk WHERE sso_user_id=$UID4;"
run "login_logs lnk"  "DELETE FROM sso_login_logs_user_lnk WHERE sso_user_id=$UID4;"
run "bindings lnk"    "DELETE FROM sso_third_party_bindings_user_lnk WHERE sso_user_id=$UID4;"
run "tokens lnk"      "DELETE FROM sso_tokens_user_lnk WHERE sso_user_id=$UID4;"
run "profiles lnk"    "DELETE FROM sso_user_profiles_user_lnk WHERE sso_user_id=$UID4;"
run "msg_jobs lnk"    "DELETE FROM sso_msg_jobs_user_lnk WHERE sso_user_id=$UID4;"
run "invite_usage lnk" "DELETE FROM sso_invite_usages_user_lnk WHERE sso_user_id=$UID4;"
run "invite_code_lnk(usage)" "DELETE FROM sso_invite_usages_invite_code_lnk WHERE sso_invite_usage_id IN (SELECT sso_invite_usage_id FROM sso_invite_usages_user_lnk WHERE sso_user_id=$UID4);"
run "referral inviter lnk" "DELETE FROM sso_referral_relations_inviter_lnk WHERE sso_user_id=$UID4;"
run "referral invitee lnk" "DELETE FROM sso_referral_relations_invitee_lnk WHERE sso_user_id=$UID4;"
run "creator lnk"     "DELETE FROM sso_invite_codes_creator_lnk WHERE sso_user_id=$UID4;"
run "point lnk"       "DELETE FROM zhao_point_records_user_lnk WHERE user_id=$UID4;"

# 父表
run "auth"     "DELETE FROM sso_auth_codes WHERE id IN (SELECT sso_auth_code_id FROM sso_auth_codes_user_lnk WHERE sso_user_id=$UID4);"
run "login_logs" "DELETE FROM sso_login_logs WHERE id IN (SELECT sso_login_log_id FROM sso_login_logs_user_lnk WHERE sso_user_id=$UID4);"
run "bindings" "DELETE FROM sso_third_party_bindings WHERE id IN (SELECT sso_third_party_binding_id FROM sso_third_party_bindings_user_lnk WHERE sso_user_id=$UID4);"
run "tokens"   "DELETE FROM sso_tokens WHERE id IN (SELECT sso_token_id FROM sso_tokens_user_lnk WHERE sso_user_id=$UID4);"
run "profiles" "DELETE FROM sso_user_profiles WHERE id IN (SELECT sso_user_profile_id FROM sso_user_profiles_user_lnk WHERE sso_user_id=$UID4);"
run "msg_jobs" "DELETE FROM sso_msg_jobs WHERE id IN (SELECT sso_msg_job_id FROM sso_msg_jobs_user_lnk WHERE sso_user_id=$UID4);"
run "invite_usages" "DELETE FROM sso_invite_usages WHERE id IN (SELECT sso_invite_usage_id FROM sso_invite_usages_user_lnk WHERE sso_user_id=$UID4);"
run "reference_relations" "DELETE FROM sso_referral_relations WHERE id IN (SELECT sso_referral_relation_id FROM sso_referral_relations_invitee_lnk WHERE sso_user_id=$UID4) OR id IN (SELECT sso_referral_relation_id FROM sso_referral_relations_inviter_lnk WHERE sso_user_id=$UID4);"
run "invite_codes" "DELETE FROM sso_invite_codes WHERE id IN (SELECT sso_invite_code_id FROM sso_invite_codes_creator_lnk WHERE sso_user_id=$UID4);"
run "points"   "DELETE FROM zhao_point_records WHERE id IN (SELECT point_record_id FROM zhao_point_records_user_lnk WHERE user_id=$UID4);"

# core + 还原
run "up_users" "DELETE FROM up_users WHERE id=$UID4;"
run "sso_users" "DELETE FROM sso_users WHERE id=$UID4;"
run "revert id2 use_count" "UPDATE sso_invite_codes SET use_count=0 WHERE id=11;"

echo "=== 校验 ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT id,username FROM sso_users ORDER BY id;"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT id,code,use_count FROM sso_invite_codes WHERE id=11;"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT count(*) FROM sso_referral_relations;"
echo DONE