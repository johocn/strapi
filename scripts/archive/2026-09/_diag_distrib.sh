#!/bin/bash
cd /www/apps/strapi
echo "=== 最新sso用户 ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT id, COALESCE(username,'') AS username, COALESCE(nickname,'') AS nickname,
       register_channel, login_count, created_at
FROM sso_users ORDER BY id DESC LIMIT 5;"
echo "=== 对应 up_users ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT id, COALESCE(username,'') AS username, provider, created_at
FROM up_users ORDER BY id DESC LIMIT 5;"
echo "=== 分销关系 referral_relations ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT id, invite_code, level, status, created_at
FROM sso_referral_relations ORDER BY id DESC LIMIT 10;"
echo "=== 邀请码使用 sso_invite_usages ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT id, invite_code, status, created_at FROM sso_invite_usages ORDER BY id DESC LIMIT 10;"
echo "=== 邀请码 sso_invite_codes ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT id, code, invite_type, status, use_count FROM sso_invite_codes ORDER BY id DESC LIMIT 10;"
echo DONE