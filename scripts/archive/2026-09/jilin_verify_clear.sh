#!/bin/bash
set -e
cd /www/apps/strapi
P=$(grep -E '^DATABASE_PASSWORD' .env | head -1 | cut -d= -f2)
Q="docker exec -e PGPASSWORD=$P 1Panel-postgresql-pIe0 psql -U strapi -d strapi -At"

echo "===== 待清理：本次「动感吉林」报名 data（核对阶段，不删） ====="

echo "--- A. signup 15 ---"
$Q -c "select id,document_id,status,points_charged,signup_at from activity_signups where id=15;"
echo "--- A2. signup lnk ---"
$Q -c "select id,activity_signup_id,activity_id from activity_signups_activity_lnk where activity_signup_id=15;"
$Q -c "select id,activity_signup_id,user_id from activity_signups_user_lnk where activity_signup_id=15;"

echo "--- B. 本次积分记录 40,41 (user 2, 21:18:45) ---"
$Q -c "select id,action,type,points,balance,source,remark,created_at from zhao_point_records where id in (40,41);"
$Q -c "select id,point_record_id,user_id from zhao_point_records_user_lnk where point_record_id in (40,41);"

echo "--- C. 消息任务 id=33 (activity.confirm pending, link 为空) ---"
$Q -c "select id,scene,status,dedupe_key,link,created_at from sso_msg_jobs where id=33;"
$Q -c "select count(*) from sso_msg_jobs_user_lnk where msg_job_id=33;" 2>/dev/null
$Q -c "select count(*) from sso_msg_jobs_template_lnk where msg_job_id=33;" 2>/dev/null
$Q -c "select count(*) from sso_msg_jobs_version_lnk where msg_job_id=33;" 2>/dev/null

echo "===== 核对完成 ====="