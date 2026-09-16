#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
DB="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
echo '=== zhao_courses 表结构 ==='
$DB -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='zhao_courses' ORDER BY ordinal_position;" -t -A
echo ''
echo '=== zhao_courses 所有行(含软删除 deleted_at) ==='
$DB -c "SELECT id, document_id, title, status, COALESCE(deleted_at::text,'') AS deleted_at, published_at FROM zhao_courses ORDER BY id;" -x
echo ''
echo '=== 同名 course 相关可能承载课程的表 ==='
$DB -c "SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%course%' ORDER BY table_name;" -t -A
echo '=== strai 软删除/历史版本表是否有课程记录 ==='
$DB -c "SELECT count(*) AS hist FROM strapi_history_versions WHERE collection_name ILIKE '%course%';" -t -A
echo 'DONE'