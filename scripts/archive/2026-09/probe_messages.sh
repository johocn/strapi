#!/bin/bash
set -e
PW=$(grep '^DATABASE_PASSWORD=' /www/apps/strapi/.env | cut -d= -f2)
export PGPASSWORD="$PW"
PSQL="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -F|"

echo "== activity_messages 列 =="
$PSQL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='activity_messages' ORDER BY ordinal_position;"

echo "== 含 lnk / 关系表（_activity / _user） =="
$PSQL -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE 'activity_messages%');"