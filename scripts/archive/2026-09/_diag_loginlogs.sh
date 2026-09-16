#!/bin/bash
cd /www/apps/strapi
echo "=== sso_login_logs 列 ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT column_name FROM information_schema.columns WHERE table_name='sso_login_logs' ORDER BY ordinal_position;"
echo "=== 最近20条登录日志 ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_login_logs ORDER BY id DESC LIMIT 20;"
echo DONE