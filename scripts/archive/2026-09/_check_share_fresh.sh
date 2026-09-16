#!/bin/bash
set -eo pipefail
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"
Q="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A"

echo "===== [1] 埋点表最新 20 条（id2 本次分享）====="
$PG "SELECT id,event,invite_code,stored_code,channel_invite_code,inviter_id,page_path,logged_in,success,detail,session_id,created_at FROM public.zhao_website_invite_traces ORDER BY id DESC LIMIT 20;"

echo ""
echo "===== [2] 分享归因表最新（share_visits）====="
$PG "SELECT * FROM public.zhao_point_share_visits ORDER BY id DESC LIMIT 20;" 2>/dev/null

echo ""
echo "===== [3] 归因关联表 inviter_lnk ====="
$PG "SELECT * FROM public.zhao_point_share_visits_inviter_lnk ORDER BY id DESC LIMIT 20;" 2>/dev/null

echo ""
echo "===== [4] 埋点表总行数 ====="
$Q -c "SELECT count(*) AS traces FROM public.zhao_website_invite_traces;"
$Q -c "SELECT count(*) AS visits FROM public.zhao_point_share_visits;"

echo "DONE"