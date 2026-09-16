#!/bin/bash
set -eo pipefail
# 验证 invite-flow/track 埋点接口 + reportShareVisit 插件名修复
echo "===== [1] 埋点接口（POST invite-flow/track）====="
curl -s -X POST "http://localhost:1337/api/zhao-website/v1/invite-flow/track" \
  -H "Content-Type: application/json" \
  -d '{"event":"landing","inviteCode":"TESTTRACE1","pagePath":"/pages/exchange/exchange"}' \
  -w "\nHTTP:%{http_code}\n"

echo ""
echo "===== [2] 旧路径 share/visit（应 404 证实原 bug）====="
curl -s -o /dev/null -w "HTTP:%{http_code}\n" -X POST "http://localhost:1337/api/v1/my/point/share/visit" -H "Content-Type: application/json" -d '{"inviteCode":"X"}'

echo ""
echo "===== [3] 新路径 share/visit（zhao-point 插件名）====="
curl -s -o /dev/null -w "HTTP:%{http_code}\n" -X POST "http://localhost:1337/api/zhao-point/v1/my/point/share/visit" -H "Content-Type: application/json" -d '{"inviteCode":"X","targetType":"exchange"}'