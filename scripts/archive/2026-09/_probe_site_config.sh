#!/bin/bash
# 测各租户 siteId 下 public/config 的 moduleGrantedForCurrentTenant
for SITE in "drxb4lxprzdoyj6tj667wpvb" "o1cxh6bxyjlnbpi8pt09jrhf" "wunxf33gwa7tqn8h2owmh9u6"; do
  echo "===== siteId=$SITE ====="
  curl -s "http://127.0.0.1:1337/api/zhao-common/v1/public/config?siteId=$SITE" \
    | python3 -c '
import sys, json
d = json.load(sys.stdin)
d = d.get("data", d)
print("siteName:", d.get("site", {}).get("siteName"))
g = d.get("moduleGrantedForCurrentTenant", {})
print("granted:", {k: g.get(k) for k in ("website", "points", "logistics", "studio")})
'
done
