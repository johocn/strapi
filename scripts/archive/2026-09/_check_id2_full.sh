#!/bin/bash
# 精确扫描 id=2 在核心用户链路关联表中的数据（sso + 分销 + 积分 + 渠道 + 网站）
set -euo pipefail
P(){ docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -tAc "$1"; }

echo "===== id=2 核心关联表扫描 ====="
check(){ # $1=表名 $2=where条件 $3=显示名
  local n
  n=$($1 2>/dev/null || echo "ERR")
  printf "  %-42s %s\n" "$3" "$n"
}

# sso 域
echo "[sso 域]"
echo "  sso_referral_relations (inviter=2):        $(P "SELECT count(*) FROM sso_referral_relations WHERE inviter_id=2")"
echo "  sso_referral_relations (invitee=2):        $(P "SELECT count(*) FROM sso_referral_relations WHERE invitee_id=2")"
for t in sso_tokens_user_lnk sso_auth_codes_user_lnk sso_login_logs_user_lnk sso_third_party_bindings_user_lnk sso_user_profiles_user_lnk sso_invite_codes_creator_lnk; do
  echo "  $t:                                      $(P "SELECT count(*) FROM ${t} WHERE sso_user_id=2")"
done
echo "  sso_invite_codes (creator lnk=2):          $(P "SELECT count(*) FROM sso_invite_codes WHERE EXISTS(SELECT 1 FROM sso_invite_codes_creator_lnk l WHERE l.sso_invite_code_id=sso_invite_codes.id AND l.sso_user_id=2)")"

# C端分享邀请/渠道
echo "[渠道/分享]"
echo "  zhao_user_invites_user_lnk:                $(P "SELECT count(*) FROM zhao_user_invites_user_lnk WHERE user_id=2")"

# 积分/活动
echo "[积分/活动]"
echo "  activity_signups_user_lnk:                 $(P "SELECT count(*) FROM activity_signups_user_lnk WHERE user_id=2")"

# 网站
echo "[网站]"
echo "  interactions (user_id=2):                  $(P "SELECT count(*) FROM interactions WHERE user_id=2")"

echo ""
echo "===== id=2 sso_users / up_users 全字段 ====="
echo "[sso_users]"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -x -c "SELECT * FROM sso_users WHERE id=2"
echo "[up_users]"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -x -c "SELECT id,username,email,provider,created_at,updated_at FROM up_users WHERE id=2"