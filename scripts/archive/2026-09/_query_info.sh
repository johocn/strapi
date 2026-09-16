#!/bin/bash
# 查询：文章 infoBoundary/localTips/summaryPoints 当前文本（只读）
set -uo pipefail
PG_CONTAINER="1Panel-postgresql-pIe0"
PG_USER="strapi"
PG_DB="strapi"
PSQL="docker exec ${PG_CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -tA -P pager=off"

$PSQL -c "SELECT document_id, title, COALESCE(info_boundary,''), COALESCE(local_tips,''), COALESCE(summary_points,''), COALESCE(source_name,''), COALESCE(source_url,'') FROM zhao_website_geo_articles WHERE deleted_at IS NULL ORDER BY id;"
