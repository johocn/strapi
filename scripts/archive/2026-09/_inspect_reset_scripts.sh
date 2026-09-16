#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== reset-users-and-points.sql: 涉及的表 ==='
grep -oiE 'DELETE FROM [a-z_]+|TRUNCATE [a-z_ ]+|DROP TABLE [a-z_]+|UPDATE [a-z_]+' /home/admin/reset-users-and-points.sql | sort | uniq -c
echo ''
echo '=== _preview_reset.sql: 涉及的表 ==='
grep -oiE 'DELETE FROM [a-z_]+|TRUNCATE [a-z_ ]+|DROP TABLE [a-z_]+|UPDATE [a-z_]+' /home/admin/_preview_reset.sql | sort | uniq -c
echo ''
echo '=== 两个脚本中是否提到 course/website ==='
grep -icE 'course|website|article|zhao_courses' /home/admin/reset-users-and-points.sql
grep -icE 'course|website|article|zhao_courses' /home/admin/_preview_reset.sql
echo ''
echo '=== 当前 strapi_history_versions 正确列 ==='
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT column_name FROM information_schema.columns WHERE table_name='strapi_history_versions' ORDER BY ordinal_position;" -t -A
echo ''
echo '=== history_versions 有没有课程相关记录 ==='
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT count(*) FROM strapi_history_versions;" -t -A
echo 'DONE'