#!/bin/bash
# 为文章 career-lifelong-learning-plan 写入 truthBasisSections（真值声明→正文段落绑定）
# 幂等：仅当该字段为空/不存在时写入
set -uo pipefail
PG_CONTAINER="1Panel-postgresql-pIe0"
PG_USER="strapi"
PG_DB="strapi"
PSQL="docker exec ${PG_CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -tA -P pager=off"

ACT_DOC="career-lifelong-learning-plan"

echo "===== 写入前 ====="
$PSQL -c "SELECT truth_basis_sections FROM zhao_website_geo_articles WHERE slug='${ACT_DOC}';"

$PSQL <<SQL
UPDATE zhao_website_geo_articles
SET truth_basis_sections = '[
  {"claimKey":"brand_slogan_joho_cn","section":"开篇"},
  {"claimKey":"platform_positioning_online_learning","section":"开篇"},
  {"claimKey":"core_keywords_edu_learning_course","section":"开篇"},
  {"claimKey":"core_domain_education","section":"开篇"},
  {"claimKey":"domain_vocational_education_def","section":"一、为什么职业没有一劳永逸"},
  {"claimKey":"domain_lifelong_learning_def","section":"一、为什么职业没有一劳永逸"},
  {"claimKey":"domain_course_def","section":"二、长期学习规划四步法"},
  {"claimKey":"domain_online_education_def","section":"三、学习资源的多元选择"},
  {"claimKey":"domain_learning_methods_def","section":"三、学习资源的多元选择"},
  {"claimKey":"domain_knowledge_payment_def","section":"四、常见的三个误区"}
]'::jsonb
WHERE slug='${ACT_DOC}'
  AND (truth_basis_sections IS NULL OR jsonb_array_length(COALESCE(truth_basis_sections, '[]'::jsonb)) = 0)
RETURNING slug, truth_basis_sections;
SQL

echo "===== 写入后 ====="
$PSQL -c "SELECT truth_basis_sections FROM zhao_website_geo_articles WHERE slug='${ACT_DOC}';"
