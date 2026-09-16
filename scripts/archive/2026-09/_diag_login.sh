#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo "=== sso login app_code=course ==="
curl -s -X POST http://127.0.0.1:1337/api/zhao-sso/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"admin","password":"__PASSWORD__","type":"password","app_code":"course"}' | head -c 900
echo ""
echo "=== sso login app_code=wealth ==="
curl -s -X POST http://127.0.0.1:1337/api/zhao-sso/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"admin","password":"__PASSWORD__","type":"password","app_code":"wealth"}' | head -c 900
