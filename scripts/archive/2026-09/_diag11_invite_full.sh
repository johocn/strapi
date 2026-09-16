#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
db(){ docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "$1"; }
echo '=== 1. sso 11号 作为被邀请者(invitee)使用过的邀请码 ==='
db "SELECT r.id rel_id, COALESCE(c.code,'') used_code, COALESCE(c2.code,'') inviter_own_code, COALESCE(r.level::text,'') level, r.created_at::text
    FROM sso_referral_relations r
    JOIN sso_referral_relations_invitee_lnk ie ON ie.sso_referral_relation_id=r.id
    LEFT JOIN sso_referral_relations_invite_code_lnk ic ON ic.sso_referral_relation_id=r.id
    LEFT JOIN sso_invite_codes c ON c.id=ic.sso_invite_code_id
    LEFT JOIN sso_referral_relations_inviter_lnk ir ON ir.sso_referral_relation_id=r.id AND ir.sso_user_id IS NOT NULL
    LEFT JOIN sso_invite_codes_creator_lnk cr ON cr.sso_invite_code_id=ic.sso_invite_code_id
    LEFT JOIN sso_invite_codes c2 ON c2.id=cr.sso_invite_code_id
    WHERE ie.sso_user_id=11;"
echo '=== 2. sso_invite_usages: 11号的邀请码使用记录 ==='
db "SELECT u.id, COALESCE(u.app_code,'') app_code, COALESCE(ic.code,'') used_code, u.used_at::text
    FROM sso_invite_usages u
    JOIN sso_invite_usages_user_lnk ul ON ul.sso_invite_usage_id=u.id
    LEFT JOIN sso_invite_usages_invite_code_lnk uic ON uic.sso_invite_usage_id=u.id
    LEFT JOIN sso_invite_codes ic ON ic.id=uic.sso_invite_code_id
    WHERE ul.sso_user_id=11;"
echo '=== 3. sso 11号 是否作为邀请者(inviter)下行关系 ==='
db "SELECT r.id rel_id, ie.sso_user_id invitee_id, COALESCE(ic.code,'') used_code FROM sso_referral_relations r
    JOIN sso_referral_relations_inviter_lnk ir ON ir.sso_referral_relation_id=r.id AND ir.sso_user_id=11
    JOIN sso_referral_relations_invitee_lnk ie ON ie.sso_referral_relation_id=r.id
    LEFT JOIN sso_referral_relations_invite_code_lnk ic ON ic.sso_referral_relation_id=r.id
    LEFT JOIN sso_invite_codes icc ON icc.id=ic.sso_invite_code_id;"
echo 'DONE'