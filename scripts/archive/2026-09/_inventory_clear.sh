#!/bin/bash
cd /www/apps/strapi
PSQL="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
echo "===== 1. sso_users id>=2 ====="
$PSQL -c "SELECT id, username, status, invite_code_used, invited_by FROM sso_users WHERE id>=2 ORDER BY id"
echo "===== 2. up_users id>=2 ====="
$PSQL -c "SELECT id, username, email, provider, sso_id, nickname, invite_code FROM up_users WHERE id>=2 ORDER BY id"
echo "===== 3. sso_ 相关表 ====="
$PSQL -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'sso_%' ORDER BY 1"
echo "===== 4. 含 sso_user_id / user_id / invitee_id / inviter_id 列的表 ====="
$PSQL -c "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('sso_user_id','user_id','up_user_id','invitee_id','inviter_id','creator_id') ORDER BY 1"
echo "===== 5. sso/up max id 与行数 ====="
$PSQL -c "SELECT 'sso_users' t, count(*) n, max(id) m FROM sso_users UNION ALL SELECT 'up_users', count(*), max(id) FROM up_users"
echo DONE