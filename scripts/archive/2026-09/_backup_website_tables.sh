#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== 备份中的所有表名(#T 行) ==='
gunzip -c /home/admin/strapi_pre_cleanup_20260830.jsonl.gz 2>/dev/null | grep '^#T' | sort
echo ''
echo '=== 备份/当前 中与 website/site/page/article/product 相关表的数据量 ==='
for t in zhao_website_articles zhao_website_articles_site_lnk zhao_website_products zhao_website_products_site_lnk zhao_website_seo_configs zhao_website_seo_configs_site_lnk zhao_website_redirect_rules zhao_website_article_categories zhao_site_configs zhao_channels_sites_lnk; do
  n=$(gunzip -c /home/admin/strapi_pre_cleanup_20260830.jsonl.gz 2>/dev/null | awk -v T="#T      $t" 'BEGIN{c=0} $0==T{f=1;next} /^#T/{f=0} f&&$0!=""{c++} END{print c}')
  echo "$t (backup) = $n"
done
echo 'DONE'