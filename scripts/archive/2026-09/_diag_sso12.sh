#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
DB(){ docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "$1"; }
echo '=== 1. sso_users id=12 ==='
DB "SELECT id, COALESCE(uuid,'') uuid, COALESCE(username,'') username, COALESCE(nickname,'') nickname, COALESCE(mobile,'') mobile, COALESCE(email,'') email, COALESCE(avatar_url,'') avatar, status, register_channel, login_count, COALESCE(invite_code_used,'') invite_code_used, created_at::text cr, updated_at::text up FROM sso_users WHERE id=12;"
echo '=== 2. up_users id=12 (身份桥接对齐验证) ==='
DB "SELECT id, COALESCE(username,'') username, COALESCE(email,'') email, COALESCE(provider,'') provider, confirmed, blocked FROM up_users WHERE id=12;"
echo '=== 3. 三方绑定 (openid) ==='
DB "SELECT b.id, COALESCE(b.provider,'') provider, COALESCE(b.provider_user_id,'') openid, COALESCE(b.provider_union_id,'') unionid, COALESCE(b.provider_nickname,'') nickname, b.bound_at::text FROM sso_third_party_bindings b JOIN sso_third_party_bindings_user_lnk l ON l.sso_third_party_binding_id=b.id WHERE l.sso_user_id=12;"
echo '=== 4. user_profiles / app_roles ==='
DB "SELECT COALESCE((SELECT count(*) FROM sso_user_profiles_user_lnk WHERE sso_user_id=12),0) profile_lnk, COALESCE((SELECT count(*) FROM sso_user_app_roles_user_lnk WHERE sso_user_id=12),0) roles_lnk;"
echo '=== 5. 邀请码相关 ==='
DB "SELECT COALESCE((SELECT string_agg(code||'|'||is_active::text, ';') FROM sso_invite_codes c JOIN sso_invite_codes_creator_lnk l ON l.sso_invite_code_id=c.id WHERE l.sso_user_id=12),'NONE') own_codes;
 SELECT COALESCE((SELECT count(*) FROM sso_invite_usages_user_lnk WHERE sso_user_id=12),0) used_invite, COALESCE((SELECT count(*) FROM sso_referral_relations_invitee_lnk WHERE sso_user_id=12),0) as_invitee, COALESCE((SELECT count(*) FROM sso_referral_relations_inviter_lnk WHERE sso_user_id=12),0) as_inviter;"
echo '=== 6. zhao-auth 渠道/角色 ==='
DB "SELECT COALESCE((SELECT count(*) FROM zhao_channel_members_user_lnk WHERE user_id=12),0) channel_member_lnk;"
echo 'DONE'