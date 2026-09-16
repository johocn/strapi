#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"

echo "===== [A] zhao_user_invites（分发/分销关系，近5条）====="
$PG "SELECT id,invite_code,invite_method,distribution_path,distribution_depth,used,created_at FROM public.zhao_user_invites ORDER BY id DESC LIMIT 5;"

echo ""
echo "===== [B] sso_referral_relations 全量（如有）====="
$PG "SELECT * FROM public.sso_referral_relations ORDER BY id;"
for lnk in inviter_player_id invitee_player_id inviter_id invitee_id; do
  $PG "SELECT * FROM public.sso_referral_relations_${lnk}_lnk ORDER BY id;" 2>/dev/null | head -10
done

echo ""
echo "===== [C] id7 的 id 对齐校验（sso_users / up_users）====="
$PG "SELECT 'sso' AS src,id,username FROM public.sso_users WHERE id=7 UNION ALL SELECT 'up',id,username FROM public.up_users WHERE id=7;"

echo ""
echo "===== [D] 若是经 useInviteCode 消费，查邀请码归属（H57G54W7=id2, 及 id7 进场码）====="
$PG "SELECT s.id AS sso, s.code, u.id AS up, u.username FROM sso_invite_codes_creator_lnk c JOIN public.sso_invite_codes s ON s.id=c.sso_invite_code_id JOIN public.sso_users su ON su.id=c.sso_user_id WHERE s.code IN ('H57G54W7');" 2>&1 | head -10
echo "DONE"