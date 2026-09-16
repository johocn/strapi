#!/bin/bash
# 清理浏览器回归测试产生的 GEO 文章草稿（标题含"回归"）
set -uo pipefail
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"

echo ">>> 清理前（标题含'回归'的 GEO 文章）："
$PG -c "SELECT id,document_id,title,status,deleted_at FROM zhao_website_geo_articles WHERE title LIKE '%回归%';"

echo ">>> 执行软删除："
$PG -c "UPDATE zhao_website_geo_articles SET deleted_at = now() WHERE title LIKE '%回归%' AND deleted_at IS NULL;"

echo ">>> 清理后校验："
$PG -c "SELECT id,title,deleted_at FROM zhao_website_geo_articles WHERE title LIKE '%回归%';"
echo "DONE"