#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"

echo "===== relation id=3 的 inviter 引用 ====="
$PG "SELECT * FROM public.sso_referral_relations_inviter_lnk ORDER BY id;"
echo "===== relation id=3 的 invitee 引用 ====="
$PG "SELECT * FROM public.sso_referral_relations_invitee_lnk ORDER BY id;"
echo "===== relation id=3 的 invite_code 引用 ====="
$PG "SELECT * FROM public.sso_referral_relations_invite_code_lnk ORDER BY id;"

echo ""
echo "===== 解开引用到具体用户名/码 ====="
$PG "SELECT su.id, su.username FROM public.sso_users su JOIN public.sso_referral_relations_inviter_lnk l ON l.sso_user_id=su.id;"
$PG "SELECT su.id, su.username FROM public.sso_users su JOIN public.sso_referral_relations_invitee_lnk l ON l.sso_user_id=su.id;"
$PG "SELECT c.code FROM public.sso_invite_codes c JOIN public.sso_referral_relations_invite_code_lnk l ON l.sso_invite_code_id=c.id;"
echo "DONE"