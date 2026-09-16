#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"

echo "===== 关联表（sso_invite_codes 归属）====="
PG_t="$PG"
$PG_t "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'sso_invite_codes%';"

echo ""
echo "===== id2 的 sso 邀请码行（code=H57G54W7）====="
$PG_t "SELECT id,code,app_code,invite_type,max_uses,use_count,is_active,created_at FROM public.sso_invite_codes WHERE code='H57G54W7';"

echo ""
echo "===== 归属关联明细（sso_invite_codes 对 user 的 _lnk）====="
for lnk in user_id owner_id created_by; do
  $PG_t "SELECT * FROM public.sso_invite_codes_${lnk}_lnk;" 2>/dev/null
done
echo "DONE"