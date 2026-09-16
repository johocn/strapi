#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
db(){ docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -t -A -c "$1"; }
echo '=== 1. sso_third_party_bindings 的用户关联 lnk 表 ==='
db "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'sso_third_party_bindings%';"
echo '=== 2. sso_third_party_bindings_user_lnk 数据(2/10) ==='
db "SELECT * FROM sso_third_party_bindings_user_lnk WHERE sso_user_id IN (2,10) ORDER BY sso_user_id;"
echo '=== 3. 这些 bindings 的 provider_user_id(即 openid) ==='
db "SELECT u.id sso_id, u.username, b.id bind_id, b.provider, COALESCE(b.provider_user_id,'') openid, COALESCE(b.provider_union_id,'') unionid, b.bound_at::text
    FROM sso_third_party_bindings b
    JOIN sso_third_party_bindings_user_lnk l ON l.sso_third_party_binding_id=b.id
    JOIN sso_users u ON u.id=l.sso_user_id
    WHERE l.sso_user_id IN (2,10) ORDER BY u.id, b.id;"
echo '=== 4. third_party_accounts 结构 ==='
db "SELECT column_name FROM information_schema.columns WHERE table_name='third_party_accounts' ORDER BY ordinal_position;"
echo '=== 5. third_party_accounts 与 sso 用户 openid 匹配 ==='
db "SELECT id, provider, COALESCE(open_id,'') open_id, COALESCE(provider_user_id,'') p_user, COALESCE(nickname,'') nick FROM third_party_accounts WHERE open_id IN ('oUl0rxCSxrhkp0__','e2e7780c') OR provider_user_id IN ('oUl0rxCSxrhkp0__','e2e7780c') ORDER BY id;"
echo 'DONE'