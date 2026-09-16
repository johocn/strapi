#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
echo "===== [A] sso_referral_relations 全量 ====="
$PG "SELECT * FROM public.sso_referral_relations ORDER BY id;" 2>&1 | head -20
echo "===== [B] inviter/invitee/invite_code _lnk 关系 ====="
for t in sso_referral_relations_inviter_lnk sso_referral_relations_invitee_lnk sso_referral_relations_invite_code_lnk; do
  echo "--- $t ---"
  $PG "SELECT * FROM public.$t ORDER BY 1;" 2>&1 | head -20
done
echo "===== [C] sso_invite_usages ====="
$PG "SELECT * FROM public.sso_invite_usages ORDER BY id DESC LIMIT 10;" 2>&1 | head -20
echo "===== [D] id5 关联 up_users/其它 distributor ====="
$PG "SELECT id,username,invite_code FROM public.up_users WHERE id IN (2,5);"
echo "DONE"