#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
db(){ docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "$1"; }
for t in sso_invite_usages sso_invite_usages_invite_code_lnk sso_invite_usages_user_lnk sso_referral_relations sso_referral_relations_invitee_lnk sso_referral_relations_inviter_lnk sso_referral_relations_invite_code_lnk; do
  echo "=== $t ===   "; db "SELECT column_name FROM information_schema.columns WHERE table_name='$t' ORDER BY ordinal_position;"
done
echo 'DONE'