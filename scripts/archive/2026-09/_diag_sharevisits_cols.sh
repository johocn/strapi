#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"

echo "===== zhao_point_share_visits 完整列 ====="
$PG "SELECT column_name FROM information_schema.columns WHERE table_name='zhao_point_share_visits' ORDER BY ordinal_position;"

echo ""
echo "===== share_visits id=7（id2 本次兑换分享落地）全字段 ====="
$PG "SELECT * FROM public.zhao_point_share_visits WHERE id=7;"
$PG "SELECT * FROM public.zhao_point_share_visits WHERE id=4;"
echo "DONE"