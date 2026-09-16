#!/bin/bash
set -euo pipefail
echo "===== id=2 自有邀请码 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_invite_codes c WHERE EXISTS (SELECT 1 FROM sso_invite_codes_creator_lnk l WHERE l.sso_invite_code_id=c.id AND l.sso_user_id=2);"
echo ""
echo "===== up_users 全部字段 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM up_users WHERE id=2;"
echo ""
echo "===== activity_signups_user_lnk (user=2) ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM activity_signups_user_lnk WHERE user_id=2;"
echo ""
echo "===== zhao_user_invites (user=2 对应) ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM zhao_user_invites WHERE id IN (SELECT user_invite_id FROM zhao_user_invites_user_lnk WHERE user_id=2);"