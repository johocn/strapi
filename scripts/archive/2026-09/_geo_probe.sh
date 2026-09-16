#!/bin/bash
set -e
PSQL="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
$PSQL -c "SELECT tablename FROM pg_tables WHERE tablename LIKE '%geo_article%' ORDER BY tablename;"
$PSQL -c "SELECT column_name,data_type FROM information_schema.columns WHERE table_name='zhao_website_geo_articles' AND column_name IN ('id','slug','title','content','status','locale','document_id') ORDER BY column_name;"
$PSQL -tAc "SELECT id,slug,status,locale,length(content) AS len FROM zhao_website_geo_articles WHERE slug='career-lifelong-learning-plan';"
$PSQL -tAc "SELECT content LIKE '%本地贴士%' AS tip, content LIKE '%补贴性培训%' AS subsidy, content LIKE '%误区一：把「报名付费」%' AS case1, content LIKE '%专家沙龙与线下报告会%' AS salon, content LIKE '%产业园区%' AS park FROM zhao_website_geo_articles WHERE slug='career-lifelong-learning-plan';"
