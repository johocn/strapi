#!/bin/bash
# 校验 h.joho.cn 线上部署 + 登录
set -uo pipefail
echo "===== 线上首页 HTTP 状态 ====="
curl -s -o /dev/null -w "index=%{http_code}\n" https://h.joho.cn/
echo ""
echo "===== index.html 引用的首个 assets 资源 ====="
A=$(curl -s https://h.joho.cn/index.html | grep -oE 'assets/[a-zA-Z0-9_-]+\.(js|css)' | head -1)
echo "asset=$A"
[ -n "$A" ] && curl -s -o /dev/null -w "$A => %{http_code}\n" "https://h.joho.cn/$A"
echo ""
echo "===== 管理端登录接口(经 nginx /api) ====="
cat > /tmp/_post2.json <<'EOF'
{"identifier":"zhao","password":"__PASSWORD__"}
EOF
curl -s -o /tmp/_login_resp.json -w "login_http=%{http_code}\n" \
  -X POST https://h.joho.cn/api/zhao-auth/v1/admin/auth/local \
  -H 'Content-Type: application/json' --data-binary @/tmp/_post2.json
grep -o '"username":"[^"]*"' /tmp/_login_resp.json || echo "no-username"
grep -o '"name":"[^"]*"' /tmp/_login_resp.json || echo "no-role"
echo "DONE"