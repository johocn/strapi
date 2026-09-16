#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
echo "===== zhao-channel 相关表 ====="
$PG -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'zhao_channel%' ORDER BY tablename;"
echo "===== channel 表 id/name 样例 ====="
$PG -c "SELECT id,document_id,name FROM zhao_channels LIMIT 10;"
echo "===== id2 在 channel-member 是否有记录 ====="
$PG -c "SELECT * FROM zhao_channel_members WHERE user_id=2 LIMIT 10;"