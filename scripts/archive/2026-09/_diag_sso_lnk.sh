#!/bin/bash
Q="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"

echo "===== 找出 sso_referral_relations 的所有 _lnk 中间表 ====="
$Q "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'sso_referral_relations%' ORDER BY tablename;"

echo ""
echo "===== 主表 id=3 记录 ====="
$Q "SELECT id,document_id,level,channel_code,created_at FROM public.sso_referral_relations WHERE id=3;"
echo "DONE"