#!/bin/bash
PSQL="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
echo "===== zhao_point_rules 全部 ====="
 $PSQL -c "SELECT id, action, points, link_type, link_target_id, link_title, task_group, enabled FROM zhao_point_rules ORDER BY id;"
echo "===== 可用活动/内容表（activity 类）====="
$PSQL -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename ILIKE '%activity%' OR tablename ILIKE '%course%' OR tablename ILIKE '%event%') ORDER BY 1;" 2>/dev/null
echo "===== activity/detail 页面数据来源：查 zhao_courses 前5 ====="
$PSQL -c "SELECT id, document_id, title, name FROM zhao_courses ORDER BY id LIMIT 5;" 2>/dev/null
echo DONE