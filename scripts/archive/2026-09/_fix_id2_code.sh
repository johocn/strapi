#!/bin/bash
set -euo pipefail
# 修复 id=2 三码漂移：zhao_user_invites.invite_code 从 OKR9840J 改为 H57G54W7（SSO自有码）
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
BEGIN;
UPDATE zhao_user_invites
SET invite_code = 'H57G54W7', updated_at = now()
WHERE id IN (SELECT user_invite_id FROM zhao_user_invites_user_lnk WHERE user_id = 2)
  AND invite_code = 'OKR9840J';
COMMIT;
SELECT ui.id, ui2s.user_id, ui.invite_code
FROM zhao_user_invites ui
JOIN zhao_user_invites_user_lnk ui2s ON ui2s.user_invite_id = ui.id
WHERE ui2s.user_id = 2;
SQL
echo "--- 三码对齐核验 ---"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -tAc "SELECT 'sso_invite_codes', code FROM sso_invite_codes WHERE EXISTS(SELECT 1 FROM sso_invite_codes_creator_lnk l WHERE l.sso_invite_code_id=sso_invite_codes.id AND l.sso_user_id=2)"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -tAc "SELECT 'up_users', invite_code FROM up_users WHERE id=2"