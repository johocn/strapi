#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
cd /www/apps/strapi
TOKEN=$(node -e "const jwt=require('jsonwebtoken');console.log(jwt.sign({id:1},'BebtpVPjDbWupMo67QRrTg==',{expiresIn:'1h'}))")
echo "=== quiz with x-site-id full error ==="
curl -s -H "Authorization: Bearer $TOKEN" -H "x-site-id: drxb4lxprzdoyj6tj667wpvb" "http://127.0.0.1:1337/api/zhao-quiz/v1/admin/quizzes?pagination%5BpageSize%5D=1" | head -c 1500
echo ""
echo "=== quiz routes (zhao-quiz content-api) ==="
grep -n 'quizzes' /www/apps/strapi/plugins/zhao-quiz/server/src/routes/content-api.ts 2>/dev/null | head
