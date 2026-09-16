#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
db(){ docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "$1"; }
echo '=== 1. sso_user_app_roles: 用户2/10 app角色 ==='
db "SELECT l.sso_user_id, r.app_code, COALESCE(r.role,'') role FROM sso_user_app_roles r JOIN sso_user_app_roles_user_lnk l ON l.sso_user_app_role_id=r.id WHERE l.sso_user_id IN (2,10) ORDER BY l.sso_user_id;"
echo '=== 2. zhao_user_channels: 用户2/10 渠道授权 ==='
db "SELECT l.user_id, c.id channel_id, c.granted_at::text grant_at FROM zhao_user_channels c JOIN zhao_user_channels_user_lnk l ON l.user_channel_id=c.id WHERE l.user_id IN (2,10) ORDER BY l.user_id;"
echo '=== 3. zhao_channel_members: 用户2/10 渠道成员 ==='
db "SELECT l.user_id, cm.id, COALESCE(cm.role,'') role, cm.is_current FROM zhao_channel_members cm JOIN zhao_channel_members_user_lnk l ON l.channel_member_id=cm.id WHERE l.user_id IN (2,10) ORDER BY l.user_id;"
echo '=== 4. zhao_role_channels: 角色渠道绑定(全量,看admin/用户) ==='
db "SELECT id, COALESCE(role,'') role, assigned_by, created_at::text FROM zhao_role_channels ORDER BY id;"
echo '=== 5. zhao_channels 主表 ==='
db "SELECT id, COALESCE(name,'') name, COALESCE(code,'') code, is_root FROM zhao_channels ORDER BY id;"
echo 'DONE'