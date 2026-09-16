#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
db(){ docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "$1"; }
echo '=== sso_users 3-9 号 ==='
db "SELECT id, COALESCE(username,'') username, COALESCE(mobile,'') mobile, COALESCE(email,'') email, register_channel, created_at::text cr FROM sso_users WHERE id BETWEEN 3 AND 9 ORDER BY id;"
echo '=== sso_third_party_bindings: 3-9号 绑定(openid+昵称) ==='
db "SELECT u.id sso_id, u.username, b.id bind_id, COALESCE(b.provider,'') provider, COALESCE(b.provider_user_id,'') openid, COALESCE(b.provider_union_id,'') unionid, COALESCE(b.provider_nickname,'') nickname, b.bound_at::text
    FROM sso_users u
    LEFT JOIN sso_third_party_bindings_user_lnk l ON l.sso_user_id=u.id
    LEFT JOIN sso_third_party_bindings b ON b.id=l.sso_third_party_binding_id
    WHERE u.id BETWEEN 3 AND 9 ORDER BY u.id;"
echo '=== third_party_accounts: 3-9号(platform/openid/nickname) ==='
db "SELECT u.id sso_id, a.id acc_id, COALESCE(a.platform,'') platform, COALESCE(a.open_id,'') openid, COALESCE(a.union_id,'') unionid, COALESCE(a.nickname,'') nickname
    FROM sso_users u LEFT JOIN third_party_accounts_user_lnk l ON l.user_id=u.id
    LEFT JOIN third_party_accounts a ON a.id=l.third_party_account_id
    WHERE u.id BETWEEN 3 AND 9 ORDER BY u.id;"
echo 'DONE'