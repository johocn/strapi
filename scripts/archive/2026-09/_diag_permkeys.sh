#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo "=== zhao login ==="
LOGIN=$(curl -s -X POST http://127.0.0.1:1337/api/zhao-auth/v1/admin/auth/local \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"zhao","password":"__PASSWORD__"}')
TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("jwt",""))')
echo "TOKEN_LEN=${#TOKEN}"
echo "=== permission-keys (zhao) ==="
curl -s http://127.0.0.1:1337/api/zhao-auth/v1/my/permission-keys -H "Authorization: Bearer $TOKEN" | python3 -c '
import sys,json
d=json.load(sys.stdin)
p=d.get("permissions",d)
print("type=",type(p).__name__,"count=",len(p))
if isinstance(p,list):
    for k in ["menu.point-center","menu.website-center","menu.channel","menu.site-config","menu.tenant","auth.admin-login","menu.point-rule","menu.website-article"]:
        print(k,"=",k in p)
    print("first10=",p[:10])
else:
    print(p)
'
