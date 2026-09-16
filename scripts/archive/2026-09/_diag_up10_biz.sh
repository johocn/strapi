#!/bin/bash
cd /www/apps/strapi
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT '=== up_users10 业务引用 ===' AS info;
SELECT 'activity_signups:' ,(SELECT count(*) FROM activity_signups_user_lnk WHERE user_id=10)
UNION ALL SELECT 'zhao_point_records:',(SELECT count(*) FROM zhao_point_records_user_lnk WHERE user_id=10)
UNION ALL SELECT 'zhao_course_enrollments:',(SELECT count(*) FROM zhao_course_enrollments_user_lnk WHERE user_id=10)
UNION ALL SELECT 'zhao_user_invites:',(SELECT count(*) FROM zhao_user_invites_user_lnk WHERE user_id=10)
UNION ALL SELECT 'zhao_channel_members:',(SELECT count(*) FROM zhao_channel_members_user_lnk WHERE user_id=10)
UNION ALL SELECT 'zhao_point_redemptions:',(SELECT count(*) FROM zhao_point_redemptions_user_lnk WHERE user_id=10)
UNION ALL SELECT 'wealth_customer_holdings:',(SELECT count(*) FROM wealth_customer_holdings_user_lnk WHERE user_id=10);
"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT '=== up_users10 row ===' AS info;
SELECT id, username, COALESCE(nickname,'') nickname, sso_id, invite_code FROM up_users WHERE id=10;
SELECT '=== sso3 profile(优佳商贸?) ===' AS info;
SELECT id, username, COALESCE(nickname,'') nickname, register_channel FROM sso_users WHERE id IN (2,3,4) ORDER BY id;
"
echo DONE