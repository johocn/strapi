#!/bin/bash
# 回归后清理：列出 title 含"回归"的 geo-article 草稿并 softDelete
set -uo pipefail
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
echo "===== 含'回归'标题的 geo_articles ====="
$PG -c "SELECT id, document_id, title, status FROM zhao_website_geo_articles WHERE title LIKE '回归%';"