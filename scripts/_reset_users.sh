#!/bin/bash
# ============================================================
# 重置注册数据：删除 sso/up 全部测试账号(id>MIN_ID) 及关联记录，
# 并重置 sso_users/up_users 自增序列为「下次新用户从 (MIN_ID+1) 开始」。
# DRY=1 只统计；DRY=0 执行（含备份）。仅保留 admin(1)。
# 用法：ssh joho "DRY=0 MIN_ID=1 bash /tmp/_reset_users.sh"
#   MIN_ID=1  → 仅保留 id=1，序列重置为 2（整库重建用户）
#   MIN_ID=2  → 保留 id=1,2，序列重置为 3
# ============================================================
set -euo pipefail
DRY="${DRY:-1}"
MIN_ID="${MIN_ID:-1}"          # 保留 id<=MIN_ID，清除 id>MIN_ID
STAMP=$(date +%Y%m%d_%H%M%S)
NEXT_ID=$((MIN_ID + 1))        # 序列重置值 = 下一新用户 id
# 动态收集待清 id 清单（逗号分隔）
PSQL="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
IDS=$($PSQL -tAc "SELECT string_agg(id::text, ',') FROM sso_users WHERE id > ${MIN_ID}" | tr -d ' ')
[ -z "$IDS" ] && echo "无 id>${MIN_ID} 用户需清理。" && exit 0

BKDIR=/home/admin/reset_users_${STAMP}
mkdir -p "$BKDIR"

echo "========== 重置注册数据 [DRY=$DRY] $STAMP =========="

if [ "$DRY" = "0" ]; then
  echo ">>> 备份到 $BKDIR ..."
  for t in sso_users up_users sso_invite_codes sso_invite_codes_creator_lnk sso_tokens sso_tokens_user_lnk sso_auth_codes sso_auth_codes_user_lnk sso_login_logs sso_login_logs_user_lnk sso_third_party_bindings sso_third_party_bindings_user_lnk sso_user_profiles sso_user_profiles_user_lnk zhao_user_invites zhao_user_invites_user_lnk; do
    docker exec 1Panel-postgresql-pIe0 pg_dump -U strapi -d strapi -t "public.${t}" > "$BKDIR/${t}.sql" 2>>"$BKDIR/pg.err" || echo "  ! ${t} 备份失败"
  done
  echo "✅ $BKDIR"
fi

echo ""
echo ">>> 受影响行数（待清 id 清单: $IDS）:"
$PSQL <<SQL
SELECT 'sso_users' t, count(*) FROM sso_users WHERE id IN ($IDS)
UNION ALL SELECT 'up_users', count(*) FROM up_users WHERE id IN ($IDS)
UNION ALL SELECT 'zhao_user_invites_user_lnk', count(*) FROM zhao_user_invites_user_lnk WHERE user_id IN ($IDS)
UNION ALL SELECT 'zhao_user_invites(孤儿)', count(*) FROM zhao_user_invites WHERE NOT EXISTS (SELECT 1 FROM zhao_user_invites_user_lnk l WHERE l.user_invite_id=zhao_user_invites.id)
UNION ALL SELECT 'sso_invite_codes(孤儿)', count(*) FROM sso_invite_codes WHERE NOT EXISTS (SELECT 1 FROM sso_invite_codes_creator_lnk l WHERE l.sso_invite_code_id=sso_invite_codes.id);
SQL

if [ "$DRY" = "1" ]; then
  echo ">>> DRY-RUN 完成。确认后: ssh joho \"DRY=0 bash /tmp/_reset_users.sh\""
  exit 0
fi

echo ""
echo ">>> 事务执行 ..."
$PSQL <<SQL
BEGIN;

-- 1) sso 用户关联 join 行（id>=2）
DELETE FROM activity_signups_user_lnk         WHERE user_id IN ($IDS);
DELETE FROM sso_auth_codes_user_lnk           WHERE sso_user_id IN ($IDS);
DELETE FROM sso_invite_codes_creator_lnk      WHERE sso_user_id IN ($IDS);
DELETE FROM sso_login_logs_user_lnk           WHERE sso_user_id IN ($IDS);
DELETE FROM sso_third_party_bindings_user_lnk WHERE sso_user_id IN ($IDS);
DELETE FROM sso_tokens_user_lnk               WHERE sso_user_id IN ($IDS);
DELETE FROM sso_user_profiles_user_lnk        WHERE sso_user_id IN ($IDS);

-- 2) zhao_user_invites 关联（C端分享邀请码归属于这些用户）
DELETE FROM zhao_user_invites_user_lnk WHERE user_id IN ($IDS);

-- 3) 引用被清 invite_codes 的额外 lnk
DELETE FROM sso_invite_usages_invite_code_lnk WHERE sso_invite_code_id IN (SELECT sso_invite_code_id FROM sso_invite_codes_creator_lnk WHERE sso_user_id IN ($IDS));
DELETE FROM sso_invite_stats_invite_code_lnk  WHERE sso_invite_code_id IN (SELECT sso_invite_code_id FROM sso_invite_codes_creator_lnk WHERE sso_user_id IN ($IDS));

-- 4) sso 父实体（已无 user-link 的孤儿）
DELETE FROM sso_auth_codes           WHERE NOT EXISTS (SELECT 1 FROM sso_auth_codes_user_lnk l WHERE l.sso_auth_code_id=sso_auth_codes.id);
DELETE FROM sso_invite_codes         WHERE NOT EXISTS (SELECT 1 FROM sso_invite_codes_creator_lnk l WHERE l.sso_invite_code_id=sso_invite_codes.id)
                                      AND NOT EXISTS (SELECT 1 FROM sso_invite_stats_invite_code_lnk s WHERE s.sso_invite_code_id=sso_invite_codes.id)
                                      AND NOT EXISTS (SELECT 1 FROM sso_invite_usages_invite_code_lnk u WHERE u.sso_invite_code_id=sso_invite_codes.id);
DELETE FROM sso_login_logs           WHERE NOT EXISTS (SELECT 1 FROM sso_login_logs_user_lnk l WHERE l.sso_login_log_id=sso_login_logs.id);
DELETE FROM sso_third_party_bindings WHERE NOT EXISTS (SELECT 1 FROM sso_third_party_bindings_user_lnk l WHERE l.sso_third_party_binding_id=sso_third_party_bindings.id);
DELETE FROM sso_tokens               WHERE NOT EXISTS (SELECT 1 FROM sso_tokens_user_lnk l WHERE l.sso_token_id=sso_tokens.id);
DELETE FROM sso_user_profiles        WHERE NOT EXISTS (SELECT 1 FROM sso_user_profiles_user_lnk l WHERE l.sso_user_profile_id=sso_user_profiles.id);
DELETE FROM activity_signups         WHERE NOT EXISTS (SELECT 1 FROM activity_signups_user_lnk l WHERE l.activity_signup_id=activity_signups.id);

-- 5) C端分享邀请码：清掉所有非管理员所属的（孤儿）zhao_user_invites
DELETE FROM zhao_user_invites WHERE NOT EXISTS (SELECT 1 FROM zhao_user_invites_user_lnk l WHERE l.user_invite_id=zhao_user_invites.id);

-- 6) 核心表
DELETE FROM up_users WHERE id IN ($IDS);
DELETE FROM sso_users WHERE id IN ($IDS);

COMMIT;
SQL

echo ""
echo ">>> 重置 sso/up 序列（下次自增从 ${NEXT_ID} 开始）"
for t in sso_users up_users; do
  seq=$(docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "SELECT pg_get_serial_sequence('${t}','id')" | tr -d ' ')
  if [ -n "$seq" ]; then
    docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "ALTER SEQUENCE ${seq} RESTART WITH ${NEXT_ID};" && echo "  ${t}: ${seq} -> ${NEXT_ID}"
  fi
done

echo ""
echo ">>> 校验："
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT id,username FROM sso_users ORDER BY id;"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT id,username FROM up_users ORDER BY id;"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT count(*) AS zhao_user_invites FROM zhao_user_invites;"
echo ">>> DONE 备份: $BKDIR"