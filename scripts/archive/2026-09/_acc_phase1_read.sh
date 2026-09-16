#!/bin/bash
# 受控验收 v1：mint id2 token 并查询当前 share/status（先纯读，验证过期窗口语义）
set -e
cd /www/apps/strapi
SECRET=$(grep -E '^JWT_SECRET=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
[ -n "$SECRET" ] || { echo "JWT_SECRET 缺失"; exit 1; }

TOKEN=$(node -e "const j=require('jsonwebtoken');process.env.SS='$SECRET';console.log(j.sign({id:2},process.env.SS,{algorithm:'HS256',expiresIn:'15m'}));")
echo "TOKEN_LEN=${#TOKEN}"

echo "===== id2 share/status（当前应为 hasLanding=true 窗口过期 canClaim=false）====="
curl -s -m 15 "http://localhost:1337/api/zhao-point/v1/my/point/share/status" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"
echo ""
echo "DONE"