#!/bin/bash
# 检查 id=2 在所有用户相关表中的残留（sso + 跨插件）
set -euo pipefail
P(){ docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -X; }

echo "===== [1] sso_users / up_users 主体 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "SELECT 'sso_users', id, COALESCE(username,''), COALESCE(uuid,'') FROM sso_users WHERE id=2"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "SELECT 'up_users', id, COALESCE(username,''), COALESCE(email,'') FROM up_users WHERE id=2"

echo ""
echo "===== [2] 查找所有含 user_id / sso_user_id / *_lnk 的用户关联表 ====="
TABLES=$(docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "
SELECT table_name FROM information_schema.columns
WHERE table_schema='public'
  AND column_name IN ('user_id','sso_user_id','inviter_id','invitee_id')
  AND table_name NOT LIKE '%_lnk'
ORDER BY table_name;")
echo "$TABLES"

echo ""
echo "===== [3] 各关联表 id=2 残留扫描 ====="
for t in $TABLES; do
  # 判定主连接列
  col=$(docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='${t}'
      AND column_name IN ('user_id','sso_user_id','inviter_id','invitee_id') LIMIT 1;")
  coltype=$(docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "
    SELECT data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='${t}'
      AND column_name IN ('user_id','sso_user_id','inviter_id','invitee_id') LIMIT 1;")
  cast_col="2"
  if [ "$coltype" = "character varying" ] || [ "$coltype" = "text" ]; then cast_col="'2'"; fi
  n=$(docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "SELECT count(*) FROM ${t} WHERE ${col}=${cast_col}")
  echo "  ${t}.${col} (${coltype}) = 2: ${n} 行"
done
echo "(扫描完毕，未列出=无残留)"

echo ""
echo "===== [4] 序列当前值 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "SELECT 'sso_users_id_seq', last_value FROM sso_users_id_seq"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "SELECT 'up_users_id_seq', last_value FROM up_users_id_seq"