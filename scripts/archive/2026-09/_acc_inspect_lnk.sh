#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"
for t in sso_referral_relations_inviter_lnk sso_referral_relations_invitee_lnk sso_referral_relations_invite_code_lnk zhao_point_records_user_lnk; do
  echo "=== $t ==="
  $PG "SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='$t' ORDER BY ordinal_position;"
done