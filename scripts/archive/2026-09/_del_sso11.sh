#!/bin/bash
set -e
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
BK=/home/admin/sso11_backup_$(date +%Y%m%d_%H%M%S)
mkdir -p $BK
DBEEP="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi"
echo "BACKUP_DIR=$BK"
# --- 备份 sso11 及其关联, 便于回滚 ---
$DBEEP -P pager=off -c "\\copy (SELECT * FROM sso_users WHERE id=11) TO STDOUT" > $BK/sso_users.sql
$DBEEP -P pager=off -c "\\copy (SELECT * FROM sso_user_profiles WHERE id IN (SELECT sso_user_profile_id FROM sso_user_profiles_user_lnk WHERE sso_user_id=11)) TO STDOUT" > $BK/sso_user_profiles.sql
$DBEEP -P pager=off -c "\\copy (SELECT * FROM sso_third_party_bindings WHERE id IN (SELECT sso_third_party_binding_id FROM sso_third_party_bindings_user_lnk WHERE sso_user_id=11)) TO STDOUT" > $BK/sso_third_party_bindings.sql
$DBEEP -P pager=off -tt -A -c "SELECT sso_third_party_binding_id FROM sso_third_party_bindings_user_lnk WHERE sso_user_id=11" > $BK/binding_ids.txt
echo "--- backup files ---"; ls -la $BK

# --- 删除 sso11: 先清关联 lnk, 再删绑定的子表记录, 最后删主表 ---
$DBEEP <<'SQL'
BEGIN;
-- 记录将删除的 binding id
DELETE FROM sso_third_party_bindings_user_lnk WHERE sso_user_id=11;
DELETE FROM sso_auth_codes_user_lnk WHERE sso_user_id=11;
DELETE FROM sso_tokens_user_lnk WHERE sso_user_id=11;
-- profile 子表(若存在且不再被引用)
DELETE FROM sso_user_profiles WHERE id NOT IN (SELECT sso_user_profile_id FROM sso_user_profiles_user_lnk) AND id IN (SELECT sso_user_profile_id FROM sso_user_profiles_user_lnk WHERE sso_user_id=11);
DELETE FROM sso_user_profiles_user_lnk WHERE sso_user_id=11;
-- 三方绑定本体(仅删 11 号自己的, 保留他人)
DELETE FROM sso_third_party_bindings WHERE id IN (SELECT id FROM sso_third_party_bindings WHERE NOT EXISTS (SELECT 1 FROM sso_third_party_bindings_user_lnk l WHERE l.sso_third_party_binding_id=sso_third_party_bindings.id));
DELETE FROM sso_users WHERE id=11;
COMMIT;
SQL
echo "--- 校验: sso_users 11 应无, 关联应清空 ---"
$DBEEP -P pager=off -c "SELECT count(*) AS sso11 FROM sso_users WHERE id=11"
$DBEEP -P pager=off -tt -A -c "SELECT count(*) FROM sso_third_party_bindings_user_lnk WHERE sso_user_id=11" | sed 's/^/bind_lnk_11=/'
$DBEEP -P pager=off -tt -A -c "SELECT count(*) FROM sso_tokens_user_lnk WHERE sso_user_id=11" | sed 's/^/token_lnk_11=/'
echo "DELETE_DONE"