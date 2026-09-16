#!/bin/bash
cd /www/apps/strapi
Q() { docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c "$1"; }
echo "== sso_channels =="
Q "SELECT id,channel_code,channel_name,is_active FROM sso_channels ORDER BY channel_code asc;"
echo "== 注册渠道分布 (sso_users.register_channel) =="
Q "SELECT register_channel, count(*) FROM sso_users GROUP BY register_channel ORDER BY count(*) desc;"
echo DONE