#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
DB(){ docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "$1"; }
echo '=== sso_users 全部列 ==='
$DB "SELECT column_name FROM information_schema.columns WHERE table_name='sso_users' ORDER BY ordinal_position;"
echo '=== sso_users 12 邀请字段(invite_code_used) ==='
DB "SELECT id, COALESCE(invite_code_used,'<>') invite_code_used, COALESCE(utm_source,'') utm_source FROM sso_users WHERE id=12;"
echo '=== 12 号作为邀请者/被邀请者(lnk) 详查 ==='
echo "-- invitee lnk (被邀请):"
DB "SELECT r.id rel, r.level, r.channel_code FROM sso_referral_relations r JOIN sso_referral_relations_invitee_lnk l ON l.sso_referral_relation_id=r.id WHERE l.sso_user_id=12;"
echo "-- invite_code lnk on relational (12 用过的码):"
DB "SELECT ic.sso_invite_code_id, c.id, COALESCE(c.code,'') code FROM sso_referral_relations_invite_code_lnk ic JOIN sso_referral_relations r ON r.id=ic.sso_referral_relation_id JOIN sso_referral_relations_invitee_lnk ie ON ie.sso_referral_relation_id=r.id LEFT JOIN sso_invite_codes c ON c.id=ic.sso_invite_code_id WHERE ie.sso_user_id=12;"
echo '=== 邀请码整体现状 ==='
DB "SELECT count(*) invite_codes_total FROM sso_invite_codes; SELECT count(*) referral_total FROM sso_referral_relations; SELECT count(*) usage_total FROM sso_invite_usages;"
echo 'DONE'