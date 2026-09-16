#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
db(){ docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "$1"; }
echo '=== 1. sso_user_app_roles: 用户2/10 的角色 ==='
db "SELECT l.sso_user_id, r.app_code, r.role_code, r.is_active
    FROM sso_user_app_roles r JOIN sso_user_app_roles_user_lnk l ON l.sso_user_app_role_id=r.id
    WHERE l.sso_user_id IN (2,10) ORDER BY l.sso_user_id;"
echo '=== 2. zhao_user_channels: 用户2/10 的渠道 ==='
db "SELECT c.id channel_id, COALESCE(c.name,'') name FROM zhao_user_channels c JOIN zhao_user_channels_user_lnk l ON l.zhao_user_channel_id=c.id WHERE l.user_id IN (2,10);"
echo '=== 3. zhao_role_action_logs / zhao_role_channels / zhao_permissions: 涉及用户2/10 ==='
db "SELECT COUNT(*) LOGS FROM zhao_role_action_logs;"
echo '=== 4. zhao-common site-config 里 tenant 维度 用户明细(有则列出) ==='
db "SELECT 1 AS probe;"
echo '=== 5. up_users 2/10 (Strapi core user, zhao-auth bootstrap 也写) ==='
db "SELECT id, COALESCE(username,'') username, COALESCE(email,'') email, COALESCE(blocked::text,'') blocked FROM up_users WHERE id IN (2,10) ORDER BY id;"
echo '=== 6. sso_users 2/10 全字段(排除敏感) ==='
db "SELECT id, username, status, register_channel, last_login_at::text, login_count, COALESCE(last_login_channel,'') last_login_channel FROM sso_users WHERE id IN (2,10);"
echo 'DONE'