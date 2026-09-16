#!/bin/bash
# 查询文章1 的 truthBasis 关联 + 正文 H2 标题（供绑定段落）
set -uo pipefail
PG_CONTAINER="1Panel-postgresql-pIe0"
PG_USER="strapi"
PG_DB="strapi"
PSQL="docker exec ${PG_CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -tA -P pager=off"

ACT_DOC="career-lifelong-learning-plan"

echo "===== 文章1 关联的真值声明（claimKey | claim | category）====="
$PSQL -c "
SELECT f.claim_key, f.claim, f.claim_category
FROM zhao_website_first_truths f
JOIN zhao_website_geo_articles_truth_basis_lnk l ON l.first_truth_policy_id = f.id
JOIN zhao_website_geo_articles a ON a.id = l.geo_article_id
WHERE a.slug = '${ACT_DOC}' AND f.deleted_at IS NULL
ORDER BY f.id;"

echo "===== 正文 H2/H3 标题 ====="
$PSQL -c "
SELECT (regexp_matches(a.content, '<h[23][^>]*>(.*?)</h[23]>', 'gi'))[1]
FROM zhao_website_geo_articles a WHERE a.slug = '${ACT_DOC}';"

echo "===== 当前 truthBasisSections ====="
$PSQL -c "SELECT truth_basis_sections FROM zhao_website_geo_articles WHERE slug='${ACT_DOC}';"
