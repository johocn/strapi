#!/bin/bash
# 将用户 id=2 更新为：username=zhao, 密码=__PASSWORD__, 角色=admin
# 含备份。DRY=1 只预览；DRY=0 执行（含备份）。
# 用法：ssh joho "DRY=0 bash /tmp/_set_id2_admin.sh"
set -uo pipefail
DRY="${DRY:-1}"
STAMP=$(date +%Y%m%d_%H%M%S)
BKDIR=/home/admin/set_id2_admin_${STAMP}
PW_HASH='$2b$10$STMhiFBPVXqcG5zfXUDoBOlkB4z4k.DRpU8c4dXJIUgPX5.QlWlUy'
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"

echo "========== 设置 id=2 -> zhao / __PASSWORD__ / admin [DRY=$DRY] $STAMP =========="

echo ""
echo ">>> 更新前现状："
$PG -c "SELECT id,username,email,zhao_roles FROM up_users WHERE id=2;"
$PG -c "SELECT id,username FROM sso_users WHERE id=2;"

if [ "$DRY" = "1" ]; then
  echo ">>> 将执行（DRY-RUN 不写入）："
  echo "  - up_users.id=2 : username='zhao', password=<bcrypt __PASSWORD__>, zhao_roles=['admin'], confirmed=true, blocked=false"
  echo "  - sso_users.id=2: username='zhao'  (保持 ID 对齐铁律)"
  echo ">>> DRY-RUN 完成。确认后: ssh joho \"DRY=0 bash /tmp/_set_id2_admin.sh\""
  exit 0
fi

echo ""
echo ">>> 备份到 $BKDIR ..."
mkdir -p "$BKDIR"
for t in up_users sso_users; do
  docker exec 1Panel-postgresql-pIe0 pg_dump -U strapi -d strapi -t "public.${t}" > "$BKDIR/${t}.sql" 2>>"$BKDIR/pg.err" || echo "  ! ${t} 备份失败"
done
echo "✅ $BKDIR"

echo ""
echo ">>> 事务执行 ..."
$PG <<SQL
BEGIN;

-- 仅当 email 或 username 未冲突时安全；目标用户为当前 id=2
UPDATE up_users
SET username = 'zhao',
    password='__REDACTED__',
    zhao_roles = '["admin"]'::jsonb,
    confirmed = true,
    blocked = false,
    updated_at = now()
WHERE id = 2;

UPDATE sso_users
SET username = 'zhao',
    updated_at = now()
WHERE id = 2;

COMMIT;
SQL

echo ""
echo ">>> 校验："
$PG -c "SELECT id,username,email,zhao_roles, confirmed, blocked, substring(password,1,7) AS pw_pfx FROM up_users WHERE id=2;"
$PG -c "SELECT id,username FROM sso_users WHERE id=2;"
echo ">>> 密码校验（bcrypt.compare）..."
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "SELECT password FROM up_users WHERE id=2;" > /tmp/_row_pw.txt
chmod 644 /tmp/_row_pw.txt
cat > /tmp/_verify_pw.cjs <<EOF
const bcrypt = require('/www/apps/strapi/node_modules/bcryptjs');
const fs = require('fs');
const row = fs.readFileSync('/tmp/_row_pw.txt','utf8').trim();
console.log('DB_PW_LEN=' + row.length);
console.log('MATCH_A963963=' + (bcrypt.compareSync('__PASSWORD__', row) ? 'OK' : 'FAIL'));
console.log('MATCH_WRONG=' + (bcrypt.compareSync('wrongpass', row) ? 'BAD(should be false)' : 'OK(rejected)'));
EOF
node /tmp/_verify_pw.cjs
echo ">>> DONE 备份: $BKDIR"