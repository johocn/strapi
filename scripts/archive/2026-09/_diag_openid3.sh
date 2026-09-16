#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
db(){ docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "$1"; }
echo '=== 1. lnk 表列名与所有行 ==='
db "SELECT column_name FROM information_schema.columns WHERE table_name='sso_third_party_bindings_user_lnk' ORDER BY ordinal_position;"
db "SELECT * FROM sso_third_party_bindings_user_lnk;"
echo '=== 2. 所有 bindings 全量(openid 对比) ==='
db "SELECT b.id bind_id, b.provider, COALESCE(b.provider_user_id,'') openid, COALESCE(b.provider_union_id,'') unionid, b.bound_at::text
    FROM sso_third_party_bindings b ORDER BY b.id;"
echo '=== 3. third_party_accounts 全量 openid ==='
db "SELECT id, platform, app_type, COALESCE(open_id,'') open_id, COALESCE(union_id,'') union_id, COALESCE(nickname,'') nick FROM third_party_accounts ORDER BY id;"
echo '=== 4. sso_users openid 相关字段(username/email 里的 openid) ==='
db "SELECT id, username, COALESCE(email,'') email FROM sso_users WHERE id IN (2,10);"
echo 'DONE'