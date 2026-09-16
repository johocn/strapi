#!/bin/bash
# 验证 zhao/__PASSWORD__ 的管理端登录
set -uo pipefail
cat > /tmp/_post.json <<'EOF'
{"identifier":"zhao","password":"__PASSWORD__"}
EOF
echo "===== 管理端登录 POST /v1/admin/auth/local ====="
curl -s -X POST http://127.0.0.1:1337/api/zhao-auth/v1/admin/auth/local \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/_post.json
echo ""