#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
echo "===== 列类型 ====="
$PG -c "SELECT column_name,data_type FROM information_schema.columns WHERE table_name='sso_referral_relations' AND column_name IN ('created_at','updated_at');"
echo "===== db timezone / now ====="
$PG -c "SHOW timezone;"
$PG -c "SELECT now() AS db_now, extract(epoch from now())*1000 AS epoch_ms;"
echo "===== 全部 relation 的 created_at 原始值 + epoch ====="
$PG -c "SELECT id, created_at, extract(epoch from created_at)*1000 AS epoch_ms FROM sso_referral_relations ORDER BY id;"
echo "===== Strapi 时区（服务器进程）====="
date; date +%s%3N