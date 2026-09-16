#!/bin/bash
# 核查 SSO 邀请码闭环是否成立（部署后运行，留存备案）
# 用法：bash _check_sso_invite_closure.sh [sso_user_id]
#   - 带 id：只核查该用户的 referral 落表 + C 端对齐
#   - 不带 id：列最近注册用户(recent)与全部 referral/usage 汇总
set -u
PSQL() { docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -v ON_ERROR_STOP=0 -P pager=off "$@"; }
TARGET="${1:-}"

echo "===== [1] sso 最近注册用户（id>=2，倒序） ====="
PSQL -c "SELECT id,username,nickname,invite_code_used,invited_by,register_channel,to_char(created_at,'MM-DD HH24:MI') created FROM sso_users WHERE id>=2 ORDER BY id DESC LIMIT 6;"

echo ""
echo "===== [2] 分销关系 sso_referral_relations（inviter→invitee） ====="
PSQL -c "SELECT r.id,r.level,r.channel_code, il.sso_user_id inviter, ie.sso_user_id invitee FROM sso_referral_relations r LEFT JOIN sso_referral_relations_inviter_lnk il ON il.sso_referral_relation_id=r.id LEFT JOIN sso_referral_relations_invitee_lnk ie ON ie.sso_referral_relation_id=r.id ORDER BY r.id;"

echo ""
echo "===== [3] 邀请使用记录 sso_invite_usages ====="
PSQL -c "SELECT u.id,u.app_code,u.channel_code,u.used_at, ul.sso_user_id uuser FROM sso_invite_usages u LEFT JOIN sso_invite_usages_user_lnk ul ON ul.sso_invite_usage_id=u.id ORDER BY u.id;"

echo ""
echo "===== [4] 邀请码 use_count（含 creator） ====="
PSQL -c "SELECT c.id,c.code,c.app_code,c.use_count, cl.sso_user_id creator FROM sso_invite_codes c LEFT JOIN sso_invite_codes_creator_lnk cl ON cl.sso_invite_code_id=c.id WHERE cl.sso_user_id IS NOT NULL ORDER BY c.id;"

echo ""
echo "===== [5] C 端 up_users 对齐（sso_id / invite_code 需与 sso 一致） ====="
if [ -n "$TARGET" ]; then
  PSQL -c "SELECT id,sso_id,nickname,avatar,invite_code,(SELECT code FROM sso_invite_codes c JOIN sso_invite_codes_creator_lnk cl ON cl.sso_invite_code_id=c.id WHERE cl.sso_user_id=up_users.id AND c.is_active AND c.use_count>=0 LIMIT 1) sso_own_code FROM up_users WHERE id=$TARGET;"
else
  PSQL -c "SELECT u.id,u.sso_id,u.nickname,u.invite_code FROM up_users u WHERE u.id>=2 ORDER BY u.id;"
fi

echo ""
echo "===== [6] referral 断言（新用户是否建了分销关系） ====="
if [ -n "$TARGET" ]; then
  PSQL -tAc "SELECT CASE WHEN count(*)>0 THEN 'PASS: referral 已建立' ELSE 'FAIL: 无 referral 关系' END FROM sso_referral_relations r JOIN sso_referral_relations_invitee_lnk ie ON ie.sso_referral_relation_id=r.id WHERE ie.sso_user_id=$TARGET;"
else
  PSQL -tAc "SELECT 'referral 总数: '||count(*) FROM sso_referral_relations;"
fi
echo DONE