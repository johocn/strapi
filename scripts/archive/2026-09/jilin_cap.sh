#!/bin/bash
set -e
cd /www/apps/strapi
P=$(grep -E '^DATABASE_PASSWORD' .env | head -1 | cut -d= -f2)
Q="docker exec -e PGPASSWORD=$P 1Panel-postgresql-pIe0 psql -U strapi -d strapi -At"
echo "=== 当前活动4 active 报名数 ==="
$Q -c "select status, count(*) from activity_signups where id in (select activity_signup_id from activity_signups_activity_lnk where activity_id=4) group by status;"

echo "=== 回退 used_capacity = 实际 active 报名数 ==="
$Q -c "update activities set used_capacity=(select count(*) from activity_signups where id in (select activity_signup_id from activity_signups_activity_lnk where activity_id=4)) where id=4;"

echo "=== 更新后 ==="
$Q -c "select id,title,capacity,used_capacity,status from activities where id=4;"