#!/bin/bash
set -e
cd /www/apps/strapi
P=$(grep -E '^DATABASE_PASSWORD' .env | head -1 | cut -d= -f2)
Q="docker exec -e PGPASSWORD=$P 1Panel-postgresql-pIe0 psql -U strapi -d strapi -At"

echo "=== 所有 activity 相关表 ==="
$Q -c "select tablename from pg_tables where schemaname='public' and tablename like '%activity%' order by tablename;"

ACT_ID=$($Q -c "select id from activities where document_id='ghanuzsbhi9qonnm712ss2wn';")
echo "活动 id: $ACT_ID"

echo "=== activities 该活动 ==="
$Q -c "select id, document_id, title from activities where document_id='ghanuzsbhi9qonnm712ss2wn';"

echo "=== activity_signups 列结构 ==="
$Q -c "select column_name, data_type from information_schema.columns where table_name='activity_signups' order by ordinal_position;"

echo "=== activity_signups_activity_lnk 结构 ==="
$Q -c "select column_name, data_type from information_schema.columns where table_name='activity_signups_activity_lnk' order by ordinal_position;"

echo "=== 该活动关联的报名 id 列表 ==="
$Q -c "select activity_signup_id from activity_signups_activity_lnk where activity_id='$ACT_ID';"

echo "=== 该报名记录详情(signup 15) ==="
$Q -c "select id, document_id, status, points_charged, signup_at from activity_signups where id=15;"

echo "=== 报名关联 user (activity_signups_user_lnk) ==="
$Q -c "select * from activity_signups_user_lnk where activity_signup_id=15;" 2>/dev/null || $Q -c "select column_name from information_schema.columns where table_name='activity_signups_user_lnk';"

echo "=== zhao_point_records 结构(标识活动/报名字段) ==="
$Q -c "select column_name, data_type from information_schema.columns where table_name='zhao_point_records' order by ordinal_position;"

echo "=== sso_msg_jobs 结构(标识活动字段) ==="
$Q -c "select column_name, data_type from information_schema.columns where table_name='sso_msg_jobs' order by ordinal_position;"

echo "=== user2 近 20 条积分记录(定位报名积分) ==="
$Q -c "select id, action, type, points, source, remark, created_at from zhao_point_records where id in (select point_record_id from zhao_point_records_user_lnk where user_id=2) order by created_at desc limit 20;" 2>/dev/null || echo "lnk查询失败"

echo "=== msg jobs scene=activity.confirm (可能包含本次报名确认) ==="
$Q -c "select id, scene, status, to_target, dedupe_key, link, created_at from sso_msg_jobs where scene='activity.confirm' order by id desc limit 20;" 2>/dev/null || echo "查scene失败"
$Q -c "select id, scene, status, to_target, dedupe_key, link, created_at from sso_msg_jobs where params like '%df65bv9gyvprn12ytq298w9x%' or dedupe_key like '%df65bv9gyvprn12ytq298w9x%' or params like '%动感%' order by id desc limit 20;" 2>/dev/null || echo "查signup失败"

echo "=== activity_messages 关联活动总数 ==="
$Q -c "select count(*) from activity_messages where id in (select activity_message_id from activity_messages_activity_lnk where activity_id='$ACT_ID');" 2>/dev/null || echo "需看messages_lnk结构"

echo "=== activity_ledgers 关联活动总数 ==="
$Q -c "select count(*) from activity_ledgers where id in (select activity_ledger_id from activity_ledgers_activity_lnk where activity_id='$ACT_ID');" 2>/dev/null || echo "需看ledgers_lnk结构"

echo "=== activity_referral_rewards 关联活动总数 ==="
$Q -c "select count(*) from activity_referral_rewards where id in (select activity_referral_reward_id from activity_referral_rewards_activity_lnk where activity_id='$ACT_ID');" 2>/dev/null || echo "需看referral_lnk结构"

echo "=== 含 point / transaction 的表 ==="
$Q -c "select tablename from pg_tables where schemaname='public' and (tablename like '%point%' or tablename like '%transaction%' or tablename like '%ledger%') order by tablename;"

echo "=== 含 msg / job 的表 ==="
$Q -c "select tablename from pg_tables where schemaname='public' and (tablename like '%msg%' or tablename like '%job%') order by tablename;"