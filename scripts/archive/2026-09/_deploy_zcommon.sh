#!/bin/bash
# 部署 zhao-common 插件：git pull + 校验 + 重启
set -e
cd /www/apps/strapi
echo "=== before: $(git log --oneline -1) ==="
git pull origin main
echo "=== after: $(git log --oneline -1) ==="
if grep -rq "__no_access_site__" plugins/zhao-common/dist/server; then
  echo "DIST_CHECK_OK"
else
  echo "DIST_CHECK_FAIL" >&2
  exit 1
fi
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
pm2 restart strapi >/dev/null 2>&1 && echo "PM2_RESTART_OK"
sleep 5
echo "=== 验证 1: admin(id=1, channel-admin角色) 站点列表 ==="
TOKEN=$(node -e "const jwt=require('jsonwebtoken');console.log(jwt.sign({id:1},'BebtpVPjDbWupMo67QRrTg==',{expiresIn:'1h'}))")
curl -s -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:1337/api/zhao-common/v1/admin/config/sites" | head -c 1200
echo ""
echo ""
echo "=== 验证 2: admin(id=1) 渠道列表 ==="
curl -s -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:1337/api/zhao-channel/v1/admin/channels" | head -c 1000
echo ""
echo ""
echo "=== 验证 3: zhao(admin角色) 站点列表（应仍全量） ==="
ZTOKEN=$(curl -s -X POST http://127.0.0.1:1337/api/zhao-auth/v1/admin/auth/local -H 'Content-Type: application/json' -d '{"identifier":"zhao","password":"__PASSWORD__"}' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).jwt||'')}catch{console.log('')}})")
curl -s -H "Authorization: Bearer $ZTOKEN" "http://127.0.0.1:1337/api/zhao-common/v1/admin/config/sites" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const d=JSON.parse(s).data||[];console.log('zhao可见站点数:',d.length, d.map(x=>x.siteName).join(','))}catch(e){console.log('parse-fail',s.slice(0,200))}})"
echo ""
echo "DONE"
