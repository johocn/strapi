#!/bin/bash
set -e
cd /www/apps/strapi
BK=/home/admin/sso10_cleanup_$(date +%Y%m%d_%H%M%S)
mkdir -p "$BK"
echo "BACKUP_DIR=$BK"

for t in sso_users sso_third_party_bindings sso_third_party_bindings_user_lnk up_users \
         sso_auth_codes_user_lnk sso_invite_codes_creator_lnk sso_tokens_user_lnk sso_user_profiles_user_lnk \
         zhao_user_invites_user_lnk zhao_channel_members_user_lnk; do
  docker exec 1Panel-postgresql-pIe0 pg_dump -U strapi -d strapi -a -t "public.$t" > "$BK/$t.dump" 2>/dev/null && echo "backed up $t" || echo "SKIP $t"
done
echo "BACKUP_OK"

docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

-- 1) 解除 bind1(优佳商贸 openid)与 sso10 的错位绑定(仅解除关联,保留 bind 记录待重绑)
DELETE FROM sso_third_party_bindings_user_lnk WHERE sso_third_party_binding_id=1;

-- 2) 清理 sso10 专属子引用
DELETE FROM sso_auth_codes_user_lnk      WHERE sso_user_id=10;
DELETE FROM sso_invite_codes_creator_lnk WHERE sso_user_id=10;
DELETE FROM sso_tokens_user_lnk          WHERE sso_user_id=10;
DELETE FROM sso_user_profiles_user_lnk   WHERE sso_user_id=10;

-- 3) 清理 up_users10 轻量业务引用
DELETE FROM zhao_user_invites_user_lnk    WHERE user_id=10;
DELETE FROM zhao_channel_members_user_lnk WHERE user_id=10;

-- 4) 删主表记录
DELETE FROM sso_users WHERE id=10;
DELETE FROM up_users  WHERE id=10;

COMMIT;

-- 校验
SELECT 'bind1 remains(no lnk)' AS a;
SELECT id, provider, LEFT(provider_user_id,18) openid FROM sso_third_party_bindings WHERE id=1;
SELECT 'sso10 count' AS b; SELECT count(*) FROM sso_users WHERE id=10;
SELECT 'up10 count'  AS c; SELECT count(*) FROM up_users WHERE id=10;
SELECT 'remaining bind lnk' AS d; SELECT * FROM sso_third_party_bindings_user_lnk ORDER BY 1;
SQL
echo "CLEAN_RC=$?"