#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
db(){ docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "$1"; }
echo '=== 1. up_users 全列 ==='
db "SELECT column_name FROM information_schema.columns WHERE table_name='up_users' ORDER BY ordinal_position;"
echo '=== 2. sso_users 11号是否存 ==='
db "SELECT id, COALESCE(uuid,'') uuid, COALESCE(username,'') username, COALESCE(nickname,'') nickname, COALESCE(mobile,'') mobile, COALESCE(email,'') email, register_channel, invite_code_used FROM sso_users WHERE id=11;"
echo '=== 3. up_users 中 ssoid=11 对应行(按 id) ==='
db "SELECT id, COALESCE(username,'') username, COALESCE(email,'') email FROM up_users WHERE id=11;"
echo '=== 4. 邀请关系表结构与11号记录 ==='
echo '--- sso_invite_codes (11创建的邀请码) ---'
db "SELECT c.id, COALESCE(c.code,'') code, c.is_active, c.created_at::text FROM sso_invite_codes c JOIN sso_invite_codes_creator_lnk l ON l.sso_invite_code_id=c.id WHERE l.sso_user_id=11;"
echo '--- sso_invite_usages (11使用的邀请码) ---'
db "SELECT u.id, COALESCE(u.invite_code_used,'') invite_code_used, COALESCE(u.status,'') status_u FROM sso_invite_usages u JOIN sso_invite_usages_user_lnk l ON l.sso_invite_usage_id=u.id WHERE l.sso_user_id=11;"
echo '--- sso_referral_relations (11为被邀请者/邀请者) ---'
db "SELECT r.id, COALESCE(iv.code,'') invitee_code, COALESCE(iv2.code,'') inviter_code FROM sso_referral_relations r
    LEFT JOIN sso_referral_relations_invitee_lnk ie ON ie.sso_referral_relation_id=r.id
    LEFT JOIN sso_invite_codes iv ON iv.id=ie.sso_invite_code_id
    LEFT JOIN sso_referral_relations_inviter_lnk ir ON ir.sso_referral_relation_id=r.id
    LEFT JOIN sso_invite_codes iv2 ON iv2.id=ir.sso_invite_code_id
    WHERE ie.sso_user_id=11 OR ir.sso_user_id=11;"
echo 'DONE'