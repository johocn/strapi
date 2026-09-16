#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
F=/home/admin/strapi_pre_cleanup_20260830.jsonl.gz
echo "=== 备份文件大小/类型 ==="
ls -la $F
head -c 300 <(gunzip -c $F 2>/dev/null | head -1)
echo ''
echo "=== 备份中涉及的表名(出现过的 collectionName 或表标识) ==="
gunzip -c $F 2>/dev/null | head -50 | cut -c1-200
echo ''
echo "=== 统计备份行数(每个表) ==="
gunzip -c $F 2>/dev/null | grep -oE '\"(collectionName|modelName|__type__|entity|table|name)\":\"[^\"]+\"' | sort | uniq -c | sort -rn | head -40
echo 'DONE'