#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
D=/www/apps/strapi/plugins/zhao-sso/dist/server
cp -a "$D" "$D.bak.$(date +%Y%m%d%H%M%S)"
cp /tmp/zsso_index.js "$D/index.js"
cp /tmp/zsso_index.mjs "$D/index.mjs"
echo "--- 自检 dist 含新方法 ---"
grep -c ensureOwnInviteCode "$D/index.js"
echo "--- 重启 strapi ---"
pm2 restart strapi --silent
sleep 4
pm2 jlist 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);[print(p['name'],p['pm2_env']['status']) for p in d if p['name']=='strapi']"
echo "DEPLOY_DONE"