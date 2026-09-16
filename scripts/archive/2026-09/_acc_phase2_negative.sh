#!/bin/bash
# 受控验收 v2：过期窗口下 earn/share 必须被拒（新文案），零发分
set -e
cd /www/apps/strapi
SECRET=$(grep -E '^JWT_SECRET=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
TOKEN=$(node -e "const j=require('jsonwebtoken');process.env.SS='$SECRET';console.log(j.sign({id:2},process.env.SS,{algorithm:'HS256',expiresIn:'15m'}));")

echo "===== id2 earn/share（过期，期望 400 + 邀约落地已超过...）====="
curl -s -m 15 -w "\nHTTP %{http_code}\n" "http://localhost:1337/api/zhao-point/v1/my/point/earn/share" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"action":"activity_share"}'
echo "===== 兑现是否残留（应为空/无新增加分记录）====="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c \
  "SELECT count(*) FROM point_records WHERE action='activity_share' AND type='increase' AND \"user\"=2;"
echo "DONE"