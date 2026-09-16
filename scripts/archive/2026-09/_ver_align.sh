#!/bin/bash
cd /www/apps/strapi
echo "--sso dist sso_id--"
grep -c 'sso_id' plugins/zhao-sso/dist/server/index.js
echo "--auth dist alignUpUser--"
grep -c 'alignUpUser' plugins/zhao-auth/dist/server/index.js
echo "--up_users cols--"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -c "select column_name from information_schema.columns where table_name='up_users' and column_name in ('sso_id','nickname','avatar','invite_code') order by 1"
echo DONE