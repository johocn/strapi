#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
DB="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
echo '=== 所有含 sso_user_id 列的表及其 11 号引用 ==='
for t in $($DB -t -A -c "SELECT table_name FROM information_schema.columns WHERE column_name='sso_user_id'"); do
  n=$($DB -t -A -c "SELECT count(*) FROM $t WHERE sso_user_id=11" 2>/dev/null)
  echo "$t -> sso_user_id=11: $n"
done
echo ''
echo '=== 含 user 指向 sso 的其它关联(binding/token/profile/auth_code/msg) ==='
for q in \
  "SELECT count(*) FROM sso_tokens_user_lnk WHERE sso_user_id=11" \
  "SELECT count(*) FROM sso_third_party_bindings_user_lnk WHERE sso_user_id=11" \
  "SELECT count(*) FROM sso_login_logs_user_lnk WHERE sso_user_id=11" \
  "SELECT count(*) FROM sso_user_profiles_user_lnk WHERE sso_user_id=11" \
  "SELECT count(*) FROM sso_auth_codes_user_lnk WHERE sso_user_id=11" \
  "SELECT count(*) FROM sso_referral_relations_invitee_lnk WHERE sso_user_id=11" \
  "SELECT count(*) FROM sso_referral_relations_inviter_lnk WHERE sso_user_id=11" \
  "SELECT count(*) FROM sso_invite_usages_user_lnk WHERE sso_user_id=11" \
  "SELECT count(*) FROM sso_msg_jobs_user_lnk WHERE sso_user_id=11" ; do
  echo "$q -> $($DB -t -A -c "$q")"
done
echo ''
echo '=== sso_invite_codes_creator_lnk / sso_follow_ups 对 11 ==='
$DB -t -A -c "SELECT count(*) FROM sso_invite_codes_creator_lnk WHERE sso_user_id=11"
echo 'DONE'