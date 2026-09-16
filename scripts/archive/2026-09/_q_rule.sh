#!/bin/bash
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT id, action, points, link_type, link_target_id, link_title, task_group, enabled FROM zhao_point_rules WHERE action='activity_share' ORDER BY id;"
echo DONE