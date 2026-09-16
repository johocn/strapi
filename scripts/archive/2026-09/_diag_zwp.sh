#!/bin/bash
set -uo pipefail
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
echo "=== pm2 status ==="
pm2 status strapi | head -5
echo "=== 1337 端口 ==="
curl -s -o /dev/null -w "strapi_http:%{http_code}\n" "http://127.0.0.1:1337/_health" || echo "health fail"
echo "=== 公开 geo-articles 路由探测 ==="
curl -s -o /dev/null -w "list_http:%{http_code}\n" "http://127.0.0.1:1337/api/zhao-website/v1/geo-articles?pageSize=1"
echo "=== 直接探测含 slug 详情 ==="
curl -s -o /dev/null -w "detail_http:%{http_code}\n" "http://127.0.0.1:1337/api/zhao-website/v1/geo-articles/career-lifelong-learning-plan"
