#!/bin/bash
# ============================================================
# 清空 id>=2 的所有用户及全量关联数据（保留 admin=1）
# 单事务；父表删除仅针对真实存在的表；动态自适应用户列。
#   DRY=1 只打印影响行数(默认)   DRY=0 执行
# ============================================================
set -u
DRY="${DRY:-1}"
PSQL() { docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -v ON_ERROR_STOP=0 -P pager=off "$@"; }
STAMP=$(date +%Y%m%d_%H%M%S)
BKDIR=/home/admin/clear_users_ALL_${STAMP}
SQLF=/tmp/_clear_all_${STAMP}.sql

LI=$(PSQL -tAc "SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%\_user\_lnk' ORDER BY 1" 2>/dev/null | tr '\n' ' ')
echo "========== 清空 id>=2 用户数据 [DRY=$DRY] $STAMP =========="
echo "user 关联 lnk 表：$LI"

# 核心行数预览
if [ "$DRY" = "1" ]; then
  echo ""
  echo ">>> 受影响行数（id>1）："
  PSQL -c "SELECT 'up_users' t,count(*) n FROM up_users WHERE id>1 UNION ALL SELECT 'sso_users',count(*) FROM sso_users WHERE id>1;"
  echo ">>> DRY-RUN 完成，未做删除。确认后执行：ssh joho \"DRY=0 bash /tmp/_clear_users_all.sh\""
  exit 0
fi

# 备份（幂等容错）
mkdir -p "$BKDIR"
for t in up_users sso_users sso_third_party_bindings sso_invite_codes sso_referral_relations zhao_point_records; do
  docker exec 1Panel-postgresql-pIe0 pg_dump -U strapi -d strapi -t "public.${t}" > "$BKDIR/${t}.sql" 2>/dev/null || echo "  ! ${t} 备份失败"
done

# ---------- 组装统一 SQL ----------
{
  echo "BEGIN;"
  # A) 父表删除（通用：每个 *_user_lnk 推导父表，存在才删）
  for lnk in $LI; do
    userCol="user_id"; if PSQL -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='$lnk' AND column_name='sso_user_id'" | grep -q 1; then userCol="sso_user_id"; fi
    parentCol=$(PSQL -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='$lnk' AND column_name<>'id' AND column_name<>'$userCol' AND position('_lnk' in column_name)=0 AND column_name NOT LIKE '%ord' ORDER BY ordinal_position LIMIT 1" | tr -d ' ')
    parentTbl=${lnk%_user_lnk}
    if [ -n "$parentCol" ] && [ "$(PSQL -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='$parentTbl'")" = "1" ]; then
      echo "DELETE FROM $parentTbl WHERE id IN (SELECT $parentCol FROM $lnk WHERE $userCol>1);"
    fi
  done
  # B) 特殊非 _user_lnk 的 user 归属父表
  if [ "$(PSQL -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='sso_referral_relations'")" = "1" ]; then
    echo "DELETE FROM sso_referral_relations WHERE id IN (SELECT sso_referral_relation_id FROM sso_referral_relations_inviter_lnk WHERE sso_user_id>1) OR id IN (SELECT sso_referral_relation_id FROM sso_referral_relations_invitee_lnk WHERE sso_user_id>1);"
  fi
  if [ "$(PSQL -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='activity_referral_rewards'")" = "1" ]; then
    echo "DELETE FROM activity_referral_rewards WHERE id IN (SELECT activity_referral_reward_id FROM activity_referral_rewards_inviter_lnk WHERE user_id>1) OR id IN (SELECT activity_referral_reward_id FROM activity_referral_rewards_invitee_lnk WHERE user_id>1);"
  fi
  if [ "$(PSQL -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='sso_invite_codes'")" = "1" ]; then
    echo "DELETE FROM sso_invite_codes WHERE id IN (SELECT sso_invite_code_id FROM sso_invite_codes_creator_lnk WHERE sso_user_id>1);"
  fi
  if [ "$(PSQL -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='sso_invite_stats'")" = "1" ]; then
    echo "DELETE FROM sso_invite_stats WHERE id IN (SELECT sso_invite_stats_id FROM sso_invite_stats_invite_code_lnk WHERE sso_invite_code_id IN (SELECT sso_invite_code_id FROM sso_invite_codes_creator_lnk WHERE sso_user_id>1));"
  fi
  # C) 清空所有 *_user_lnk join 行
  for lnk in $LI; do
    userCol="user_id"; if PSQL -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='$lnk' AND column_name='sso_user_id'" | grep -q 1; then userCol="sso_user_id"; fi
    echo "DELETE FROM $lnk WHERE $userCol>1;"
  done
  # D) 特殊 lnk join 行
  echo "DELETE FROM sso_referral_relations_inviter_lnk WHERE sso_user_id>1;"
  echo "DELETE FROM sso_referral_relations_invitee_lnk WHERE sso_user_id>1;"
  echo "DELETE FROM activity_referral_rewards_inviter_lnk WHERE user_id>1;"
  echo "DELETE FROM activity_referral_rewards_invitee_lnk WHERE user_id>1;"
  echo "DELETE FROM sso_invite_codes_creator_lnk WHERE sso_user_id>1;"
  echo "DELETE FROM sso_invite_usages_invite_code_lnk WHERE sso_invite_code_id IN (SELECT sso_invite_code_id FROM sso_invite_codes_creator_lnk WHERE sso_user_id>1);"
  echo "DELETE FROM sso_invite_stats_invite_code_lnk WHERE sso_invite_code_id IN (SELECT sso_invite_code_id FROM sso_invite_codes_creator_lnk WHERE sso_user_id>1);"
  echo "DELETE FROM sso_referral_relations_invite_code_lnk WHERE sso_invite_code_id IN (SELECT sso_invite_code_id FROM sso_invite_codes_creator_lnk WHERE sso_user_id>1);"
  PSQL -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='zhao_point_share_visits_inviter_lnk'" | grep -q 1 && echo "DELETE FROM zhao_point_share_visits_inviter_lnk WHERE user_id>1;"
  # E) core
  echo "DELETE FROM up_users WHERE id>1;"
  echo "DELETE FROM sso_users WHERE id>1;"
  echo "COMMIT;"
} > "$SQLF"

echo ">>> 生成的 SQL: $SQLF"
# 预览已生成 DELETE 条数
grep -c '^DELETE' "$SQLF"

echo ">>> 事务执行删除 ..."
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -v ON_ERROR_STOP=1 -P pager=off -f - < "$SQLF"

echo ">>> 重置序列（下次自增从 2 开始）"
for t in sso_users up_users; do
  seq=$(PSQL -tAc "SELECT pg_get_serial_sequence('$t','id')" | tr -d ' ')
  if [ -n "$seq" ]; then PSQL -tAc "ALTER SEQUENCE ${seq} RESTART WITH 2;" >/dev/null && echo "  $t: -> 2"; fi
done

echo ""
echo ">>> 清空后校验："
PSQL -c "SELECT id,username FROM sso_users ORDER BY id;"
PSQL -c "SELECT id,username FROM up_users ORDER BY id;"
echo ">>> DONE。备份: $BKDIR"