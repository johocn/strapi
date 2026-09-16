#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"

echo "===== sso_invite_codes 表结构 ====="
$PG "SELECT column_name FROM information_schema.columns WHERE table_name='sso_invite_codes' ORDER BY ordinal_position;"

echo ""
echo "===== sso_invite_codes 里 creator=2 的行 ====="
$PG "SELECT * FROM public.sso_invite_codes WHERE "creator_id"='2' OR "creatorId"='2' OR "user_id"='2' OR "userId"='2' ORDER BY id;" 2>&1 | head -40

echo ""
echo "===== 最近 sso_invite_usages ====="
$PG "SELECT * FROM public.sso_invite_usages ORDER BY id DESC LIMIT 10;" 2>&1 | head -40
echo "DONE"