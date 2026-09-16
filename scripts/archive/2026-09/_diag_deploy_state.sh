#!/bin/bash
echo "=== zhao-auth syncSsoProfile ==="
grep -c "syncSsoProfile" /www/apps/strapi/plugins/zhao-auth/dist/server/index.js || true
echo "=== zhao-sso ensureOwnInviteCode ==="
grep -c "ensureOwnInviteCode" /www/apps/strapi/plugins/zhao-sso/dist/server/index.js || true
echo "=== up_users cols ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "select column_name from information_schema.columns where table_schema='public' and table_name='up_users' and column_name in ('sso_id','nickname','avatar','invite_code') order by 1"
echo "=== pm2 strapi status ==="
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
pm2 jlist 2>/dev/null | grep -o '"name":"strapi"' | head -1
echo DONE