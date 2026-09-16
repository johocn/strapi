#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
db(){ docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "$1"; }
for t in sso_user_app_roles sso_user_app_roles_user_lnk zhao_user_channels zhao_user_channels_user_lnk zhao_role_channels zhao_role_channels_channel_lnk; do
  echo "=== $t 列 ==="
  db "SELECT column_name FROM information_schema.columns WHERE table_name='$t' ORDER BY ordinal_position;"
done
echo 'DONE'