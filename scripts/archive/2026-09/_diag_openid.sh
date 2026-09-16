#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
dblist() {
  docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -t -A -c "$1"
}
echo '=== 1. 含 openid 的列/表 ==='
dblist "SELECT table_name||'.'||column_name FROM information_schema.columns WHERE column_name ILIKE '%openid%' OR column_name ILIKE '%open_id%' OR column_name ILIKE '%unionid%';"
echo ''
echo '=== 2. sso_users 2/10 号核心字段 ==='
dblist "SELECT id, uuid, username, COALESCE(mobile,'') mobile, COALESCE(email,'') email, status, register_channel, created_at::text, updated_at::text FROM sso_users WHERE id IN (2,10) ORDER BY id;"
echo ''
echo '=== 3. sso_third_party_bindings 结构 ==='
dblist "SELECT column_name FROM information_schema.columns WHERE table_name='sso_third_party_bindings' ORDER BY ordinal_position;"
echo ''
echo '=== 4. sso_third_party_bindings 2/10 号用户绑定真名 ==='
dblist "SELECT u.id AS sso_user_id, u.username, b.id AS bind_id, COALESCE(b.provider,'') provider, COALESCE(b.app_type,'') app_type, COALESCE(b.identifier,'') identifier, COALESCE(b.openid,'') openid, COALESCE(b.unionid,'') unionid FROM sso_users u LEFT JOIN sso_third_party_bindings b ON b.user_id=u.id WHERE u.id IN (2,10) ORDER BY u.id, b.id;"
echo 'DONE'