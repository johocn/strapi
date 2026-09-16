#!/bin/bash
# 验证生产 API：geo-article 接口返回 truthBasisSections 字段
set -uo pipefail
# 未登录走公开接口（前端路径带 /api 前缀）
curl -s "http://127.0.0.1:1337/api/zhao-website/v1/geo-articles?pageSize=1" | grep -o "truthBasisSections" | head -1
echo "---HTTP_STATUS---"
curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:1337/api/zhao-website/v1/geo-articles?pageSize=1"
echo ""
