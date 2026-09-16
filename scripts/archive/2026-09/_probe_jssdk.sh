#!/bin/bash
set -eo pipefail
# 验证 SSO 模式下 jssdk-signature 是否返回有效的 appId/signature
URL='https://v.joho.cn/#/pages/exchange/exchange'

echo "=== 1. 经反代(v.joho.cn/api) 直测 jssdk-signature, domain=v.joho.cn ==="
curl -s -m 20 -X POST "https://v.joho.cn/api/zhao-third/v1/third/jssdk-signature?domain=v.joho.cn" \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://v.joho.cn' \
  -d "{\"url\":\"${URL}\"}" -w "\nHTTP %{http_code}\n"

echo ""
echo "=== 2. 后端本地直连 1337 再测一次（排除反代差异）==="
curl -s -m 20 -X POST "http://localhost:1337/api/zhao-third/v1/third/jssdk-signature?domain=v.joho.cn" \
  -H 'Content-Type: application/json' \
  -d "{\"url\":\"${URL}\"}" -w "\nHTTP %{http_code}\n"

echo ""
echo "=== 3. 回退分支路径确认：三方配置表是否为空 ==="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT count(*) AS third_party_configs FROM public.third_party_configs;" 2>&1
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%oauth%config%' OR table_name LIKE '%third%config%';" 2>&1
echo "DONE"