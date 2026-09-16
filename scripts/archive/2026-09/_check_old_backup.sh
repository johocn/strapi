#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
cd /home/admin
echo '=== 备份1: strapi_pre_cleanup_20260830.jsonl.gz 中 zhao_site_configs 内容 ==='
zcat strapi_pre_cleanup_20260830.jsonl.gz | awk '/^#T\tzhao_site_configs/{f=1;next} /^#T\t/{f=0} f' | head -40
echo ''
echo '=== 备份1: zhao_channels 内容 ==='
zcat strapi_pre_cleanup_20260830.jsonl.gz | awk '/^#T\tzhao_channels/{f=1;next} /^#T\t/{f=0} f' | head -40
echo ''
echo '=== 备份1: 是否存在 vjoho/v.joho/圣麟 相关站点字段 ==='
zcat strapi_pre_cleanup_20260830.jsonl.gz | grep -i 'joho\|圣麟\|shenglin' | grep -i 'site_config\|channel' | head -20