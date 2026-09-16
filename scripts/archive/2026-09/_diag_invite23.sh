#!/bin/bash
# 核查 id2 / id3 邀请关系（joho Strapi 生产库，只读）
set -u
DB="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -v ON_ERROR_STOP=0"

echo "########## 一、id2 / id3 身份与邀请信息 ##########"
$DB -c "SELECT id, document_id, username, email, sso_id, nickname, invite_code, invited_by, created_at FROM up_users WHERE id IN (2,3) ORDER BY id;"
$DB -c "SELECT id, document_id, username, nickname, invite_code_used, invited_by, created_at FROM sso_users WHERE id IN (2,3) ORDER BY id;"

echo ""
echo "########## 二、邀请码表（id2/3 创建的码 + 使用次数）##########"
$DB -c "SELECT l.sso_user_id owner, c.id, c.code, c.invite_type, c.max_uses, c.use_count, c.is_active, c.created_at FROM sso_invite_codes_creator_lnk l JOIN sso_invite_codes c ON c.id=l.sso_invite_code_id WHERE l.sso_user_id IN (2,3) ORDER BY l.sso_user_id;"

echo ""
echo "########## 三、分销关系表（是否 2→3）##########"
$DB -c "SELECT r.document_id, r.level, r.channel_code FROM sso_referral_relations r ORDER BY r.id DESC LIMIT 20;"
$DB -c "SELECT il.sso_referral_relation_id rel_id, il.sso_user_id inviter FROM sso_referral_relations_inviter_lnk il ORDER BY il.id;"
$DB -c "SELECT il.sso_referral_relation_id rel_id, il.sso_user_id invitee FROM sso_referral_relations_invitee_lnk il ORDER BY il.id;"

echo ""
echo "########## 四、邀请使用记录（id3 是否使用过邀请码）##########"
$DB -c "SELECT u.document_id, u.channel_code, u.app_code, u.used_at, ul.sso_user_id FROM sso_invite_usages u LEFT JOIN sso_invite_usages_user_lnk ul ON ul.sso_invite_usage_id=u.id WHERE ul.sso_user_id IN (2,3) OR u.channel_code IS NOT NULL ORDER BY u.id DESC LIMIT 20;"

echo ""
echo "########## 五、activity 分销奖励（id2/id3）##########"
$DB -c "SELECT document_id, points, source_invite_code, issued_at FROM activity_referral_rewards ORDER BY id DESC LIMIT 20;"

echo ""
echo "########## 六、id2/3 分享相关积分流水 ##########"
$DB -c "SELECT r.document_id, r.action, r.points, r.remark, r.created_at, lnk.user_id FROM zhao_point_records r JOIN zhao_point_records_user_lnk lnk ON lnk.point_record_id=r.id WHERE lnk.user_id IN (2,3) ORDER BY r.id DESC LIMIT 20;"

echo DONE