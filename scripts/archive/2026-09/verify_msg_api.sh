#!/bin/bash
set -e
DOCID="kdyv7bl6s95avdbeme677uyq"   # 活动「动感吉林1」documentId
SSOID=2                             # 留言5归属 sso_user id（= up_user id）

PW=$(grep '^DATABASE_PASSWORD=' /www/apps/strapi/.env | cut -d= -f2)
export PGPASSWORD="$PW"
UUID=$(docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c "SELECT uuid FROM sso_users WHERE id=$SSOID;")
echo "sso user${SSOID} uuid=$UUID"

SSO_SECRET=$(grep '^SSO_JWT_SECRET=' /www/apps/strapi/.env | cut -d= -f2)

TOKEN=$(SSO_SECRET="$SSO_SECRET" UUID="$UUID" node -e '
const c=require("crypto");
const b=x=>Buffer.from(JSON.stringify(x)).toString("base64url");
const iat=Math.floor(Date.now()/1000);
const h=b({alg:"HS256",typ:"JWT"});
const p=b({sub:String(process.env.UUID),type:"access",jti:c.randomUUID(),iat,exp:iat+3600});
const s=c.createHmac("sha256",process.env.SSO_SECRET).update(h+"."+p).digest("base64url");
console.log(h+"."+p+"."+s);')

echo "== 带 SSO user${SSOID} token 请求 /api/zhao-point/v1/my/activity/$DOCID/messages =="
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:1337/api/zhao-point/v1/my/activity/$DOCID/messages"
echo