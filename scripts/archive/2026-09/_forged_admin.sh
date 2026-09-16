#!/bin/bash
# 伪造 admin(id=1) token 验证完整请求链（排查 admin 无法访问积分管理）
cd /www/apps/strapi
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2

pick_secret() {
  for K in JWT_SECRET ADMIN_JWT_SECRET; do
    V=$(grep -E "^$K=" .env | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
    [ -n "$V" ] && echo "$V" && return 0
  done
}

mk_token() {
  node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({id:1}, process.argv[1], {expiresIn:'1h'}))" "$1"
}

SITE="drxb4lxprzdoyj6tj667wpvb"  # 圣麟口腔
for SECRET_KEY in JWT_SECRET ADMIN_JWT_SECRET; do
  SECRET=$(grep -E "^$SECRET_KEY=" .env | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  [ -z "$SECRET" ] && continue
  TOKEN=$(mk_token "$SECRET")
  OUT="/tmp/_perm_${SECRET_KEY}.json"
  CODE=$(curl -s -o "$OUT" -w "%{http_code}" \
    'http://127.0.0.1:1337/api/zhao-auth/v1/my/permission-keys' \
    -H "Authorization: Bearer $TOKEN" -H "x-site-id: $SITE")
  echo "[$SECRET_KEY] HTTP $CODE"
  if [ "$CODE" = "200" ]; then
    echo "$TOKEN" > /tmp/_admin_token.txt
    echo "===== permission-keys（id=1, 圣麟口腔租户） ====="
    python3 -c '
import json
d = json.load(open("'"$OUT"'"))
d = d.get("data", d)
perms = d.get("permissions", [])
center = [k for k in perms if "point" in k or "center" in k or k.startswith("menu.")]
print("total:", len(perms))
print("point/center/menu keys:", center)
'
    echo "===== my/roles ====="
    curl -s 'http://127.0.0.1:1337/api/zhao-auth/v1/my/roles' \
      -H "Authorization: Bearer $TOKEN" -H "x-site-id: $SITE" | head -c 600
    echo ""
    echo "===== my/channel-scope ====="
    curl -s 'http://127.0.0.1:1337/api/zhao-auth/v1/my/channel-scope' \
      -H "Authorization: Bearer $TOKEN" -H "x-site-id: $SITE" | head -c 400
    echo ""
    echo "===== my/tenants ====="
    curl -s 'http://127.0.0.1:1337/api/zhao-auth/v1/my/tenants' \
      -H "Authorization: Bearer $TOKEN" | head -c 600
    echo ""
    echo "===== 积分记录接口(带圣麟租户) ====="
    curl -s -o /tmp/_rec.json -w "HTTP %{http_code}\n" \
      'http://127.0.0.1:1337/api/zhao-point/v1/admin/point-records?page=1&pageSize=5' \
      -H "Authorization: Bearer $TOKEN" -H "x-site-id: $SITE"
    head -c 400 /tmp/_rec.json
    echo ""
    break
  fi
done
