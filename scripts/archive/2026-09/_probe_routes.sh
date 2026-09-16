#!/bin/bash
set -eo pipefail
echo "=== A1. strapi 直连: invite-flow/track ==="
curl -s -m 15 -w "\nHTTP %{http_code}\n" -X POST http://localhost:1337/api/zhao-website/v1/invite-flow/track -H "Content-Type: application/json" -d '{"event":"probe"}'
echo "=== A2. strapi 直连: zhao-point share/visit ==="
curl -s -m 15 -w "\nHTTP %{http_code}\n" -X POST http://localhost:1337/api/zhao-point/v1/my/point/share/visit -H "Content-Type: application/json" -d '{"targetType":"exchange"}'

echo "=== B1. v.joho.cn 反代(浏览器 Origin): invite-flow/track ==="
curl -s -m 15 -w "\nHTTP %{http_code}\n" -X POST http://v.joho.cn/api/zhao-website/v1/invite-flow/track -H "Content-Type: application/json" -H "Origin: http://v.joho.cn" -H "Referer: http://v.joho.cn/#/pages/exchange/exchange" -d '{"event":"probe"}'
echo "=== B2. v.joho.cn 反代(浏览器 Origin): zhao-point share/visit ==="
curl -s -m 15 -w "\nHTTP %{http_code}\n" -X POST http://v.joho.cn/api/zhao-point/v1/my/point/share/visit -H "Content-Type: application/json" -H "Origin: http://v.joho.cn" -H "Referer: http://v.joho.cn/#/pages/exchange/exchange" -d '{"targetType":"exchange"}'
echo "PROBE_DONE"