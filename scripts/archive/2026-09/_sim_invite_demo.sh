#!/bin/bash
# 在线模拟：带 id2(赵义涛) 邀请码 register 建立分销链路，验证 buildReferralRelation 落表
set -u
UNAME="test_inv_$(date +%H%M%S)"
BASE="http://localhost:1337"
CODE="ZW8SWHP6"           # id2 的邀请码
PSQL() { docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -v ON_ERROR_STOP=0 -P pager=off "$@"; }

echo "=== 注册前：id2 邀请码 use_count ==="
PSQL -c "SELECT id,code,use_count FROM sso_invite_codes WHERE code='$CODE';"

echo ""
echo "=== 调用 register 建立推荐链路 (username=$UNAME, invite_code=$CODE) ==="
RESP=$(curl -s -X POST "$BASE/api/zhao-sso/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"data\":{\"username\":\"$UNAME\",\"password\":\"Test@1234\",\"app_code\":\"course\",\"invite_code\":\"$CODE\"}}")
echo "$RESP"
NEWID=$(echo "$RESP" | grep -oE '"ssoUserId":\s*[0-9]+' | head -1 | grep -oE '[0-9]+')

echo ""
echo "=== 落表校验 ==="
echo "--- sso_users（新用户 id=$NEWID, 应含 invite_code_used/invited_by）---"
PSQL -c "SELECT id,username,invite_code_used,invited_by FROM sso_users WHERE id=$NEWID;"
echo "--- sso_referral_relations（inviter=2 -> invitee=$NEWID）---"
PSQL -c "SELECT r.document_id,r.level,r.channel_code, il.sso_user_id inviter, ie.sso_user_id invitee FROM sso_referral_relations r JOIN sso_referral_relations_inviter_lnk il ON il.sso_referral_relation_id=r.id JOIN sso_referral_relations_invitee_lnk ie ON ie.sso_referral_relation_id=r.id WHERE il.sso_user_id=2 AND ie.sso_user_id=$NEWID;"
echo "--- sso_invite_usages ---"
PSQL -c "SELECT u.document_id,u.app_code,u.channel_code,u.used_at, ul.sso_user_id uuser FROM sso_invite_usages u JOIN sso_invite_usages_user_lnk ul ON ul.sso_invite_usage_id=u.id WHERE ul.sso_user_id=$NEWID;"
echo "--- id2 邀请码 use_count（应为 1）---"
PSQL -c "SELECT id,code,use_count FROM sso_invite_codes WHERE code='$CODE';"
echo "--- zhao_point_records（邀请奖励积分，若有）---"
PSQL -c "SELECT r.action,r.points,r.remark, lnk.user_id FROM zhao_point_records r JOIN zhao_point_records_user_lnk lnk ON lnk.point_record_id=r.id WHERE lnk.user_id=$NEWID OR lnk.user_id=2 ORDER BY r.id;"
echo "RESULT_UNEWID=$NEWID"