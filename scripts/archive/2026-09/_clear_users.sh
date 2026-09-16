#!/bin/bash
# ============================================================
# 清空注册数据：sso_users/up_users id>=2 + 全量关联数据（备份后事务删除）
# 高风险！仅应在确认可丢弃这些账号后执行。
#   DRY=1  只打印计划与受影响行数（默认）
#   DRY=0  执行：pg_dump 备份 -> 事务删除 -> 重置序列 -> 校验
# ============================================================
set -euo pipefail
DRY="${DRY:-1}"

STAMP=$(date +%Y%m%d_%H%M%S)
IDS="2,3,4,5,6,7,8,9,10,11,12,13,14,15,16"

# 备份表清单
BK="sso_users sso_auth_codes sso_auth_codes_user_lnk sso_invite_codes sso_invite_codes_creator_lnk \
sso_invite_usages sso_invite_usages_invite_code_lnk sso_invite_usages_user_lnk \
sso_invite_stats sso_invite_stats_invite_code_lnk \
sso_login_logs sso_login_logs_user_lnk \
sso_third_party_bindings sso_third_party_bindings_user_lnk \
sso_tokens sso_tokens_user_lnk \
sso_user_profiles sso_user_profiles_user_lnk \
up_users activity_signups activity_signups_user_lnk"

BKDIR=/home/admin/clear_users_${STAMP}
mkdir -p "$BKDIR"

echo "========== 清空注册数据 [DRY=$DRY] $STAMP ========== "

if [ "$DRY" = "0" ]; then
  echo ">>> 备份表到 $BKDIR ..."
  for t in $BK; do
    docker exec 1Panel-postgresql-pIe0 pg_dump -U strapi -d strapi -t "public.${t}" \
      > "$BKDIR/${t}.sql" 2>>"$BKDIR/pg_dump.err" || echo "  ! ${t} 备份失败"
  done
  echo "✅ 备份完成: $BKDIR"
fi

# 受影响行数统计（dry-run 展示）
echo ""
echo ">>> 受影响行数（在 IDS 范围内）:"
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
SELECT 'sso_users' t, count(*) FROM sso_users WHERE id IN (2,3,4,5,6,7,8,9,10,11,12,13,14,15,16)
UNION ALL SELECT 'up_users', count(*) FROM up_users WHERE id IN (2,3,4,5,6,7,8,9,10,11,12,13,14,15,16)
UNION ALL SELECT 'sso_auth_codes', count(*) FROM sso_auth_codes WHERE id IN (SELECT sso_auth_code_id FROM sso_auth_codes_user_lnk WHERE sso_user_id IN (2,3,4,5,6,7,8,9,10,11,12,13,14,15,16))
UNION ALL SELECT 'sso_invite_codes', count(*) FROM sso_invite_codes WHERE id IN (SELECT sso_invite_code_id FROM sso_invite_codes_creator_lnk WHERE sso_user_id IN (2,3,4,5,6,7,8,9,10,11,12,13,14,15,16))
UNION ALL SELECT 'sso_login_logs', count(*) FROM sso_login_logs WHERE id IN (SELECT sso_login_log_id FROM sso_login_logs_user_lnk WHERE sso_user_id IN (2,3,4,5,6,7,8,9,10,11,12,13,14,15,16))
UNION ALL SELECT 'sso_third_party_bindings', count(*) FROM sso_third_party_bindings WHERE id IN (SELECT sso_third_party_binding_id FROM sso_third_party_bindings_user_lnk WHERE sso_user_id IN (2,3,4,5,6,7,8,9,10,11,12,13,14,15,16))
UNION ALL SELECT 'sso_tokens', count(*) FROM sso_tokens WHERE id IN (SELECT sso_token_id FROM sso_tokens_user_lnk WHERE sso_user_id IN (2,3,4,5,6,7,8,9,10,11,12,13,14,15,16))
UNION ALL SELECT 'sso_user_profiles', count(*) FROM sso_user_profiles WHERE id IN (SELECT sso_user_profile_id FROM sso_user_profiles_user_lnk WHERE sso_user_id IN (2,3,4,5,6,7,8,9,10,11,12,13,14,15,16))
UNION ALL SELECT 'activity_signups', count(*) FROM activity_signups WHERE id IN (SELECT activity_signup_id FROM activity_signups_user_lnk WHERE user_id IN (2,3,4,5,6,7,8,9,10,11,12,13,14,15,16));
SQL

if [ "$DRY" = "1" ]; then
  echo ">>> DRY-RUN 完成，未做删除。确认后: ssh joho \"DRY=0 bash /tmp/_clear_users.sh\""
  exit 0
fi

echo ""
echo ">>> 事务执行删除 ..."
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<SQL
BEGIN;

-- 1) 用户关联 join 行
DELETE FROM activity_signups_user_lnk        WHERE user_id IN ($IDS);
DELETE FROM sso_auth_codes_user_lnk          WHERE sso_user_id IN ($IDS);
DELETE FROM sso_invite_codes_creator_lnk     WHERE sso_user_id IN ($IDS);
DELETE FROM sso_login_logs_user_lnk          WHERE sso_user_id IN ($IDS);
DELETE FROM sso_third_party_bindings_user_lnk WHERE sso_user_id IN ($IDS);
DELETE FROM sso_tokens_user_lnk              WHERE sso_user_id IN ($IDS);
DELETE FROM sso_user_profiles_user_lnk       WHERE sso_user_id IN ($IDS);

-- 2) 引用被清 invite_codes 的额外 lnk（防孤儿）
DELETE FROM sso_invite_usages_invite_code_lnk WHERE sso_invite_code_id IN (SELECT sso_invite_code_id FROM sso_invite_codes_creator_lnk WHERE sso_user_id IN ($IDS));
DELETE FROM sso_invite_stats_invite_code_lnk  WHERE sso_invite_code_id IN (SELECT sso_invite_code_id FROM sso_invite_codes_creator_lnk WHERE sso_user_id IN ($IDS));

-- 3) 父实体
DELETE FROM sso_auth_codes           WHERE id IN (SELECT sso_auth_code_id FROM sso_auth_codes_user_lnk WHERE sso_user_id IN ($IDS));
DELETE FROM sso_invite_codes         WHERE id IN (SELECT sso_invite_code_id FROM sso_invite_codes_creator_lnk WHERE sso_user_id IN ($IDS));
DELETE FROM sso_login_logs           WHERE id IN (SELECT sso_login_log_id FROM sso_login_logs_user_lnk WHERE sso_user_id IN ($IDS));
DELETE FROM sso_third_party_bindings WHERE id IN (SELECT sso_third_party_binding_id FROM sso_third_party_bindings_user_lnk WHERE sso_user_id IN ($IDS));
DELETE FROM sso_tokens               WHERE id IN (SELECT sso_token_id FROM sso_tokens_user_lnk WHERE sso_user_id IN ($IDS));
DELETE FROM sso_user_profiles        WHERE id IN (SELECT sso_user_profile_id FROM sso_user_profiles_user_lnk WHERE sso_user_id IN ($IDS));
DELETE FROM activity_signups         WHERE id IN (SELECT activity_signup_id FROM activity_signups_user_lnk WHERE user_id IN ($IDS));

-- 4) 核心表
DELETE FROM up_users WHERE id IN ($IDS);
DELETE FROM sso_users WHERE id IN ($IDS);

COMMIT;
SQL

echo ""
echo ">>> 重置 sso/up 序列（下次自增从 6 开始）"
for t in sso_users up_users; do
  seq=$(docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "SELECT pg_get_serial_sequence('${t}','id')" | tr -d ' ')
  if [ -n "$seq" ]; then
    docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "ALTER SEQUENCE ${seq} RESTART WITH 6;" && echo "  ${t}: ${seq} -> 6"
  fi
done

echo ""
echo ">>> 清空后校验："
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT id,username FROM sso_users ORDER BY id;"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT id,username FROM up_users ORDER BY id;"
echo ">>> DONE。备份: $BKDIR"