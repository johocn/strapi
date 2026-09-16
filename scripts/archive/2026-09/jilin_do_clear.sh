#!/bin/bash
set -e
cd /www/apps/strapi
P=$(grep -E '^DATABASE_PASSWORD' .env | head -1 | cut -d= -f2)
Q="docker exec -e PGPASSWORD=$P 1Panel-postgresql-pIe0 psql -U strapi -d strapi -At"

echo "===== 开始清理「动感吉林」本次报名 ====="

echo "--- 删除 signup 关联与记录 ---"
$Q -c "delete from activity_signups_activity_lnk where activity_signup_id=15;"
$Q -c "delete from activity_signups_user_lnk where activity_signup_id=15;"
$Q -c "delete from activity_signups where id=15;"

echo "--- 消息任务 33 及关联 ---"
$Q -c "delete from sso_msg_jobs_user_lnk where msg_job_id=33;"
$Q -c "delete from sso_msg_jobs_template_lnk where msg_job_id=33;"
$Q -c "delete from sso_msg_jobs_version_lnk where msg_job_id=33;"
$Q -c "delete from sso_msg_jobs where id=33;"

echo "===== 清理完成，验证如下 ====="

echo "=== 该活动剩余报名数 ---"
$Q -c "select count(*) from activity_signups where id in (select activity_signup_id from activity_signups_activity_lnk where activity_id=4);"
echo "--- 消息任务 33 剩余 ---"
$Q -c "select count(*) from sso_msg_jobs where id=33;"
echo "--- 积分流水 40,41 保留确认 ---"
$Q -c "select count(*) from zhao_point_records where id in (40,41);"
echo "--- activities 该活动仍存在 ---"
$Q -c "select id,document_id,title from activities where id=4;"