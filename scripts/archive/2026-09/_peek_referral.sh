#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"
echo "===== sso_referral_relations 全量 ====="
$PG "SELECT * FROM public.sso_referral_relations ORDER BY id;"
echo ""
echo "===== 关联 _lnk ====="
for lnk in inviter_player_id invitee_player_id inviter_id invitee_id; do
  $PG "SELECT * FROM public.sso_referral_relations_${lnk}_lnk;" 2>/dev/null
done
echo ""
echo "===== sso_invite_usages 全量 ====="
$PG "SELECT * FROM public.sso_invite_usages ORDER BY id;"
echo ""
echo "===== 最近埋点（如有）====="
$PG "SELECT id,event,invite_code,inviter_id,page_path,created_at FROM public.zhao_website_invite_traces ORDER BY id DESC LIMIT 10;"
echo "DONE"