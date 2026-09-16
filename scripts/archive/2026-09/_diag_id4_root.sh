#!/bin/bash
set -eo pipefail
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"

echo "===== [A] zhao_point_share_visits 结构 + 数据（分享归因核心）====="
$PG "SELECT column_name FROM information_schema.columns WHERE table_name='zhao_point_share_visits' ORDER BY ordinal_position;"
$PG "SELECT id, target_type, target_id, created_at FROM public.zhao_point_share_visits ORDER BY id DESC LIMIT 30;"
echo "--- inviter lnk ---"
$PG "SELECT * FROM public.zhao_point_share_visits_inviter_lnk ORDER BY 1 DESC LIMIT 30;"

echo ""
echo "===== [B] zhao_website_visit_logs 结构（重点找 id4 落地时的 pagePath/参数）====="
$PG "SELECT column_name FROM information_schema.columns WHERE table_name='zhao_website_visit_logs' ORDER BY ordinal_position;"

echo ""
echo "===== [C] 访问日志里 id4 相关 + 含 invite 参数记录 ====="
$PG "SELECT * FROM public.zhao_website_visit_logs_user_id_lnk WHERE user_id=4 ORDER BY 1 DESC LIMIT 20;"
$PG "SELECT id, page_path, query_params, source, ip_address, created_at FROM public.zhao_website_visit_logs WHERE id IN (SELECT \"visit_log_id\" FROM public.zhao_website_visit_logs_user_id_lnk WHERE user_id=4) ORDER BY id;" 2>/dev/null || $PG "SELECT * FROM public.zhao_website_visit_logs ORDER BY id DESC LIMIT 10;"

echo ""
echo "===== [D] id3 作为对照组：若 id3 是经 id2 邀请来的，看其归因 ====="
$PG "SELECT id, username, invite_code, created_at FROM public.up_users WHERE id IN (2,3,4,5) ORDER BY id;"
$PG "SELECT * FROM public.zhao_website_visit_logs_user_id_lnk WHERE user_id IN (3,4,5) ORDER BY 1 DESC LIMIT 20;"

echo "DONE"