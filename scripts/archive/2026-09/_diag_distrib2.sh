#!/bin/bash
cd /www/apps/strapi
echo "=== sso_referral_relations 列 ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT column_name FROM information_schema.columns WHERE table_name='sso_referral_relations' ORDER BY ordinal_position;"
echo "=== sso_referral_relations 数据 + lnk ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_referral_relations ORDER BY id DESC LIMIT 10;"
echo "--- inviter lnk ---"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_referral_relations_inviter_lnk ORDER BY id DESC LIMIT 10;"
echo "--- invitee lnk ---"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_referral_relations_invitee_lnk ORDER BY id DESC LIMIT 10;"
echo "=== sso_invite_codes (creator lnk) ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_invite_codes ORDER BY id DESC LIMIT 10;"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_invite_codes_creator_lnk ORDER BY id DESC LIMIT 10;"
echo "=== sso_invite_usages (user lnk) ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_invite_usages ORDER BY id DESC LIMIT 10;"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_invite_usages_user_lnk ORDER BY id DESC LIMIT 10;"
echo DONE