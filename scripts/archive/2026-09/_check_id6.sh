#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"

echo "===== [1] 埋点表全量（id6 链路：landing/use_invite/login_callback 等）====="
$PG "SELECT id,event,invite_code,stored_code,channel_invite_code,inviter_id,page_path,logged_in,success,detail,session_id,user_id,created_at FROM public.zhao_website_invite_traces ORDER BY id;"

echo ""
echo "===== [2] 分享归因表（新增落地）====="
$PG "SELECT id,target_type,target_id,created_at FROM public.zhao_point_share_visits ORDER BY id;"
$PG "SELECT * FROM public.zhao_point_share_visits_inviter_lnk ORDER BY id;"

echo ""
echo "===== [3] id6 用户信息 ====="
$PG "SELECT id,username,invite_code,created_at FROM public.up_users WHERE id=6;"
$PG "SELECT id,username,created_at FROM public.sso_users WHERE id=6;"

echo ""
echo "===== [4] 分销关系（inviter=2 → invitee=6?）====="
for lnk in inviter_player_id invitee_player_id inviter_id invitee_id; do
  $PG "SELECT * FROM public.sso_referral_relations_${lnk}_lnk ORDER BY id;" 2>/dev/null
done

echo ""
echo "===== [5] sso 邀请码使用记录（id2 的 H57G54W7 是否被 consume）====="
$PG "SELECT * FROM public.sso_invite_usages ORDER BY id DESC LIMIT 10;" 2>/dev/null
$PG "SELECT id,code,use_count FROM public.sso_invite_codes WHERE code='H57G54W7';"

echo ""
echo "===== [6] id6 的用户邀请券/绑定（zhao_user_invites）====="
$PG "SELECT column_name FROM information_schema.columns WHERE table_name='zhao_user_invites' ORDER BY ordinal_position;" 2>/dev/null
$PG "SELECT * FROM public.zhao_user_invites ORDER BY id DESC LIMIT 10;" 2>/dev/null
echo "DONE"