#!/bin/bash
set -uo pipefail
PG_CONTAINER="1Panel-postgresql-pIe0"
PG_USER="strapi"
PG_DB="strapi"
PSQL="docker exec ${PG_CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -tA -P pager=off"

echo "===== 文章1 正文 H2/H3 标题 ====="
$PSQL -c "SELECT (regexp_matches(content, '<h[23][^>]*>(.*?)</h[23]>', 'gi'))[1] FROM zhao_website_geo_articles WHERE document_id='ga-main-000000001';"
echo "===== 文章1 正文前 400 字 ====="
$PSQL -c "SELECT substring(content from 1 for 400) FROM zhao_website_geo_articles WHERE document_id='ga-main-000000001';"
