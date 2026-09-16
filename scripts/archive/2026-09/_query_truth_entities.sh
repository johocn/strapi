#!/bin/bash
# 查询：文章 truthBasis / mentionedEntities 实际数据形态（只读）
set -uo pipefail
PG_CONTAINER="1Panel-postgresql-pIe0"
PG_USER="strapi"
PG_DB="strapi"
PSQL="docker exec ${PG_CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -tA -P pager=off"

echo "===== 文章真值声明（claim | category | priority | status）====="
$PSQL -c "SELECT f.id, f.claim, f.claim_category, f.priority, f.status FROM zhao_website_first_truths f WHERE f.deleted_at IS NULL ORDER BY f.id;"

echo "===== 文章→真值声明 lnk 分布 ====="
$PSQL -c "SELECT * FROM zhao_website_geo_articles_truth_basis_lnk ORDER BY geo_article_id;" 2>/dev/null || $PSQL -c "SELECT tablename FROM pg_tables WHERE tablename LIKE '%truth%' OR tablename LIKE '%truth_basis%';"

echo "===== 知识实体（name | entityType | confidence | sourceType | status）====="
$PSQL -c "SELECT id, name, entity_type, confidence, source_type, status FROM zhao_website_knowledge_entities WHERE deleted_at IS NULL ORDER BY id;"

echo "===== 文章→知识实体 lnk 分布 ====="
$PSQL -c "SELECT * FROM zhao_website_geo_articles_mentioned_entities_lnk ORDER BY geo_article_id;" 2>/dev/null || $PSQL -c "SELECT tablename FROM pg_tables WHERE tablename LIKE '%mention%';"
