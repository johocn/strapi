#!/bin/bash
# 回填存量 up_users 富字段对齐：从 sso_users 取昵称/头像，从 creator_lnk 取真实专属邀请码
# DRY=1 打印将要更新的行；DRY=0 执行
set -euo pipefail
DRY="${DRY:-1}"
PSQL="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"

echo "===== 待回填 up_users（sso_id/昵称/头像/专属码 缺失的）====="
$PSQL <<'SQL'
SELECT up.id, up.username, up.sso_id, up.nickname, up.invite_code,
       s.nickname AS sso_nick, s.avatar_url AS sso_avatar,
       c.code AS own_invite
FROM up_users up
LEFT JOIN sso_users s ON s.id=up.id
LEFT JOIN sso_invite_codes_creator_lnk cl ON cl.sso_user_id=up.id
LEFT JOIN sso_invite_codes c ON c.id=cl.sso_invite_code_id
WHERE up.id > 1 AND (up.sso_id IS NULL OR up.invite_code IS NULL OR up.invite_code='' OR up.invite_code LIKE 'U%')
ORDER BY up.id;
SQL

if [ "$DRY" = "1" ]; then
  echo ">>> DRY-RUN，未写库。"
  exit 0
fi

echo "===== 回填执行 ====="
$PSQL <<'SQL'
UPDATE up_users up
SET sso_id    = up.id,
    nickname  = COALESCE(NULLIF(up.nickname,''), s.nickname),
    avatar    = COALESCE(NULLIF(up.avatar,''), s.avatar_url),
    invite_code = COALESCE(NULLIF(up.invite_code,''), c.code),
    updated_at = now()
FROM sso_users s
LEFT JOIN sso_invite_codes_creator_lnk cl ON cl.sso_user_id = s.id
LEFT JOIN sso_invite_codes c ON c.id = cl.sso_invite_code_id
WHERE up.id = s.id
  AND up.id > 1
  AND (up.sso_id IS NULL OR up.invite_code IS NULL OR up.invite_code='' OR up.invite_code LIKE 'U%');
SQL
echo DONE