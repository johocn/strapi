#!/bin/bash
# 实测 public/config 在不同 Host / siteId 下的 moduleGrantedForCurrentTenant
for HOST in "h.joho.cn" "v.joho.cn" "www.shenglin.vip"; do
  echo "===== Host: $HOST ====="
  curl -s -H "Host: $HOST" "http://127.0.0.1/api/zhao-common/v1/public/config" \
    | python3 -c '
import sys, json
d = json.load(sys.stdin)
d = d.get("data", d)
site = d.get("site", {})
print("siteName:", site.get("siteName"), "| domain:", site.get("domain"))
print("moduleGranted:", json.dumps({k: v for k, v in d.get("moduleGrantedForCurrentTenant", {}).items() if k in ("website","points","course","quiz")}, ensure_ascii=False))
print("moduleEnabled:", json.dumps({k: v for k, v in d.get("moduleEnabled", {}).items() if k in ("website","points","course","quiz")}, ensure_ascii=False))
print("websiteVisibility:", d.get("moduleVisibility", {}).get("website"))
print("pointsVisibility:", d.get("moduleVisibility", {}).get("points"))
'
done
