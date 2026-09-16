#!/bin/bash
Q="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"
echo "=== point 相关表 ==="
$Q "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%point%' ORDER BY tablename;"
echo "=== sso_referral_relations 主表结构列 ==="
$Q "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='sso_referral_relations' ORDER BY ordinal_position;"
echo "=== sso 相关表（找 point/balance）==="
$Q "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%point%' OR tablename LIKE '%balance%' ORDER BY tablename;"