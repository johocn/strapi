#!/bin/bash
# 只读检查：新注册用户的分享关系与任务积分（joho Strapi 生产库）
set -u
DB="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -v ON_ERROR_STOP=0"

echo "########## 一、sso/up 用户与邀请码 ##########"
$DB <<'SQL'
\echo '=== up_users 近15 ==='
SELECT id, username, sso_id, nickname, invite_code, created_at FROM up_users WHERE id>=2 ORDER BY id DESC LIMIT 15;
\echo '=== sso 与 up 对齐（差分）===
SELECT s.id sso_id, s.username sso_uname, u.id up_id FROM sso_users s FULL OUTER JOIN up_users u ON s.id=u.id WHERE s.id>=2 OR u.id>=2 ORDER BY COALESCE(s.id,u.id);
SQL

echo ""
echo "########## 二、邀请码表 ##########"
$DB -c "SELECT id, creator, invite_code, invite_type, use_count, is_active, created_at FROM sso_invite_codes ORDER BY id DESC LIMIT 20;"

echo ""
echo "########## 三、分享关系表 ##########"
echo "--- sso_referral_relations ---"
$DB -c "SELECT * FROM sso_referral_relations ORDER BY id DESC LIMIT 20;"
echo "--- sso_invite_usages ---"
$DB -c "SELECT * FROM sso_invite_usages ORDER BY id DESC LIMIT 20;"
echo "--- activity_referral_rewards ---"
$DB -c "SELECT * FROM activity_referral_rewards ORDER BY id DESC LIMIT 20;"
echo "--- activity_share_visits ---"
$DB -c "SELECT count(*), min(created_at), max(created_at) FROM activity_share_visits;"
$DB -c "SELECT id, inviter_id, invite_code, target_type, target_id, created_at FROM activity_share_visits ORDER BY id DESC LIMIT 15;"

echo ""
echo "########## 四、任务/分享积分 ##########"
echo "--- zhao_point_records 各 action 数量 ---"
$DB -c "SELECT action, count(*) FROM zhao_point_records GROUP BY action ORDER BY count(*) DESC;"
echo "--- 近期 share 相关积分（带用户名）---"
$DB -c "SELECT r.id, r.action, r.points, r.remark, r.created_at, lnk.user_id FROM zhao_point_records r JOIN zhao_point_records_user_lnk lnk ON lnk.point_record_id=r.id WHERE r.action LIKE '%share%' ORDER BY r.id DESC LIMIT 20;"