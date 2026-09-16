#!/bin/bash
PSQL="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
DID="4f9575ee7904198ea53678836ad4c05e"
echo "===== activity_signups 列 ====="
$PSQL -c "SELECT column_name FROM information_schema.columns WHERE table_name='activity_signups' ORDER BY ordinal_position;"
echo "===== activity_signups_user_lnk 结构 ====="
$PSQL -c "SELECT column_name FROM information_schema.columns WHERE table_name='activity_signups_user_lnk' ORDER BY ordinal_position;"
echo "===== 该活动 active 报名 (join user) ====="
$PSQL -c "SELECT s.id AS signup_id, uln.user_id, s.status, s.tour_progress FROM activity_signups s JOIN activity_signups_user_lnk uln ON uln.activity_signup_id=s.id JOIN activity_signups_activity_lnk alnk ON alnk.activity_signup_id=s.id AND alnk.activity_id=1 WHERE s.status='active' ORDER BY uln.user_id;"
echo DONE