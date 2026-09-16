#!/bin/bash
PSQL="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
DID="4f9575ee7904198ea53678836ad4c05e"
echo "===== tour_stories 表结构 ====="
$PSQL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='tour_stories' ORDER BY ordinal_position;"
echo "===== 该活动关联 story ====="
$PSQL -c "SELECT a.id, a.document_id, a.title, l.tour_stories_id FROM activities a LEFT JOIN activities_story_lnk l ON l.activities_id=a.id WHERE a.document_id='$DID';"
echo "===== tour_stories 内容 (roles) ====="
$PSQL -c "SELECT id, title, roles FROM tour_stories ORDER BY id DESC LIMIT 10;" 2>/dev/null
echo DONE