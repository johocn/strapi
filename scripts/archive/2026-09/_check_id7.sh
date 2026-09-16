#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"

echo "===== [1] 埋点表全量（关键：debug_share / landing / use_invite / login_callback）====="
$PG "SELECT id,event,invite_code,stored_code,channel_invite_code,inviter_id,page_path,logged_in,success,detail,session_id,created_at FROM public.zhao_website_invite_traces ORDER BY id;"

echo ""
echo "===== [2] 分享归因表（落地）====="
$PG "SELECT id,target_type,target_id,created_at FROM public.zhao_point_share_visits ORDER BY id;"
$PG "SELECT * FROM public.zhao_point_share_visits_inviter_lnk ORDER BY id;"

echo ""
echo "===== [3] id7 用户信息 ====="
$PG "SELECT id,username,invite_code,created_at FROM public.up_users WHERE id=7;"
$PG "SELECT id,username,created_at FROM public.sso_users WHERE id=7;"

echo ""
echo "===== [4] 分销关系（inviter=2 → invitee=7?）====="
for lnk in inviter_player_id invitee_player_id inviter_id invitee_id; do
  $PG "SELECT * FROM public.sso_referral_relations_${lnk}_lnk ORDER BY id;" 2>/dev/null | head -20
done

echo ""
echo "===== [5] sso 邀请码使用（H57G54W7）====="
$PG "SELECT * FROM public.sso_invite_usages ORDER BY id DESC LIMIT 10;"
$PG "SELECT id,code,use_count,is_active FROM public.sso_invite_codes WHERE code='H57G54W7';"

echo ""
echo "===== [6] id7 的邀请券记录 ====="
$PG "SELECT * FROM public.zhao_user_invites ORDER BY id DESC LIMIT 5;"
echo "DONE"