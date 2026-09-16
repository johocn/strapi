#!/bin/bash
# 验证生产 API：geo-article 接口返回 truthBasisSections 字段
set -uo pipefail
echo "=== list 是否含 truthBasisSections ==="
curl -s "http://127.0.0.1:1337/api/zhao-website/v1/geo-articles?pageSize=1" | grep -o "truthBasisSections" | head -1 || echo "NOT_FOUND_IN_LIST"
echo "=== detail(career-lifelong-learning-plan) 是否含 truthBasisSections ==="
curl -s "http://127.0.0.1:1337/api/zhao-website/v1/geo-articles/career-lifelong-learning-plan" | grep -o "truthBasisSections" | head -1 || echo "NOT_FOUND_IN_DETAIL"
echo "=== detail 含 claimKey 条数 ==="
curl -s "http://127.0.0.1:1337/api/zhao-website/v1/geo-articles/career-lifelong-learning-plan" | grep -o "claimKey" | wc -l
