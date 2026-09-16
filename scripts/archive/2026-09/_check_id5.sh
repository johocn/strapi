#!/bin/bash
set -eo pipefail
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"

echo "===== [1] 埋点表全量（id5 链路）====="
$PG "SELECT id,event,invite_code,stored_code,channel_invite_code,inviter_id,page_path,logged_in,success,detail,session_id,created_at FROM public.zhao_website_invite_traces ORDER BY id;"

echo ""
echo "===== [2] 分享归因表全量 ====="
$PG "SELECT id,target_type,target_id,created_at FROM public.zhao_point_share_visits ORDER BY id;"
$PG "SELECT * FROM public.zhao_point_share_visits_inviter_lnk ORDER BY 1;"

echo ""
echo "===== [3] id5 用户 ====="
$PG "SELECT id,username,invite_code,created_at,updated_at FROM public.up_users WHERE id=5;"
$PG "SELECT id,username,created_at,updated_at FROM public.sso_users WHERE id=5;"

echo ""
echo "===== [4] 分销关系明细（inviter=2 或 invitee 相关）====="
$PG "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'sso_referral_relation%';"
for lnk in inviter_player_id invitee_player_id inviter_id invitee_id; do
  $PG "SELECT * FROM public.sso_referral_relations_${lnk}_lnk ORDER BY 1;" 2>/dev/null
done

echo ""
echo "===== [5] 邀请码使用记录 ====="
$PG "SELECT * FROM public.sso_invite_usages ORDER BY id DESC LIMIT 10;" 2>/dev/null

echo "DONE"