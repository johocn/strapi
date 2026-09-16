#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
cd /home/admin
echo '=== 8-30 备份中 sso_oauth_configs 数据行（除 schema 外的真实记录） ==='
zcat strapi_pre_cleanup_20260830.jsonl.gz | awk '/^#T\tsso_oauth_configs/{f=1;next} /^#T\t/{f=0} f' | grep -v 'strapi_content_types_schema' | head -40
echo ''
echo '=== 该备份该表总行数 ==='
zcat strapi_pre_cleanup_20260830.jsonl.gz | awk '/^#T\tsso_oauth_configs/{f=1;next} /^#T\t/{f=0} f' | wc -l
echo ''
echo '=== 所有可用的逻辑备份文件 ==='
ls -la --time-style=long-iso /home/admin/strapi_pre_cleanup_*.jsonl.gz /home/admin/*.gz 2>/dev/null | head -20
echo 'DONE'