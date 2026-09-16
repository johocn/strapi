#!/bin/bash
set -e
PW=$(grep '^DATABASE_PASSWORD=' /www/apps/strapi/.env | cut -d= -f2)
export PGPASSWORD="$PW"
PSQL="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -F|"

echo "== lnk 列名 =="
$PSQL -c "SELECT column_name FROM information_schema.columns WHERE table_name='activity_messages_user_lnk' ORDER BY ordinal_position;"
$PSQL -c "SELECT column_name FROM information_schema.columns WHERE table_name='activity_messages_activity_lnk' ORDER BY ordinal_position;"

echo "== 全部留言(join 活动/用户/SSO) =="
$PSQL -c "
SELECT m.id, m.content, m.status, m.reply,
       m.created_at, m.replied_at,
       a.document_id AS act_doc, a.title AS act_title,
       u.id AS user_id, s.username,
       COALESCE(s.username,u.username) AS owner
FROM activity_messages m
LEFT JOIN activity_messages_activity_lnk la ON la.activity_message_id = m.id
LEFT JOIN activities a  ON a.id = la.activity_id
LEFT JOIN activity_messages_user_lnk lu ON lu.activity_message_id = m.id
LEFT JOIN up_users u ON u.id = lu.user_id
LEFT JOIN sso_users s ON s.id = u.id
ORDER BY m.id;"

echo "== 是否含 read 相关字段 =="
$PSQL -c "SELECT column_name FROM information_schema.columns WHERE table_name='activity_messages' AND (column_name ILIKE '%read%' OR column_name ILIKE '%seen%' OR column_name ILIKE '%viewed%');"