#!/bin/bash
PSQL="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
echo "===== tour/story/activity 相关表 ====="
$PSQL -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename ILIKE '%tour%' OR tablename ILIKE '%story%') ORDER BY 1;"
DID="4f9575ee7904198ea53678836ad4c05e"
echo "===== 活动记录 (document_id=$DID) ====="
$PSQL -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename ILIKE '%activit%' ORDER BY 1;"
$PSQL -c "SELECT id, document_id, title, tour_mode FROM zhao_point_activities WHERE document_id='$DID';" 2>/dev/null
echo "===== story 名/字段 (tour_story 可能存在) ====="
$PSQL -c "SELECT document_id, title, roles FROM zhao_point_tour_stories LIMIT 20;" 2>/dev/null || echo "zhao_point_tour_stories 不存在"
echo DONE