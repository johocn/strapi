#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
DB="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -t -A"
echo '=== 核心网站内容表当前行数 ==='
for t in zhao_website_articles zhao_website_products zhao_website_faqs zhao_website_tutorials zhao_website_cases zhao_website_brand_infos zhao_website_seo_configs zhao_website_redirect_rules sso_wx_menus; do
  n=$($DB -c "SELECT count(*) FROM $t" 2>/dev/null)
  echo "$t = $n"
done
echo ''
echo '=== 备份文件列表(直径含网站/配置的) ==='
ls -la /home/admin/*.jsonl.gz /home/admin/*.dump /home/admin/site_warehouse/* 2>/dev/null | tail -20
ls -la /home/admin/site_pre_restore/ /home/admin/site_extraconfig_backup/ /home/admin/site_oauth_backup/ 2>/dev/null | head
echo 'DONE'