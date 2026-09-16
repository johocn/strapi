#!/bin/bash
# 模拟前端请求链：游客(无x-site-id) vs 带租户
echo "===== 无 x-site-id（登录页游客场景） ====="
curl -s "http://127.0.0.1:1337/api/zhao-common/v1/public/config" | python3 -c '
import sys, json
d = json.load(sys.stdin)
d = d.get("data", d)
g = d.get("moduleGrantedForCurrentTenant", {})
print("granted:", {k: g.get(k) for k in ("website", "points")})
print("moduleEnabled:", {k: d.get("moduleEnabled", {}).get(k) for k in ("website", "points")})
'
echo ""
echo "===== x-site-id=drxb4lxprzdoyj6tj667wpvb（圣麟口腔） ====="
curl -s "http://127.0.0.1:1337/api/zhao-common/v1/public/config" -H "x-site-id: drxb4lxprzdoyj6tj667wpvb" | python3 -c '
import sys, json
d = json.load(sys.stdin)
d = d.get("data", d)
g = d.get("moduleGrantedForCurrentTenant", {})
print("granted:", {k: g.get(k) for k in ("website", "points")})
'
