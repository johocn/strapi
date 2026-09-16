#!/bin/bash
# 查看各租户 public/config 返回的 moduleVisibility 与 moduleEnabled
for SITE in "drxb4lxprzdoyj6tj667wpvb" "o1cxh6bxyjlnbpi8pt09jrhf" "wunxf33gwa7tqn8h2owmh9u6"; do
  echo "===== siteId=$SITE ====="
  curl -s "http://127.0.0.1:1337/api/zhao-common/v1/public/config?siteId=$SITE" \
    | python3 -c '
import sys, json
d = json.load(sys.stdin)
d = d.get("data", d)
print("siteName:", d.get("site", {}).get("siteName"))
mv = d.get("moduleVisibility", {})
me = d.get("moduleEnabled", {})
for k in ("website", "points", "course", "channel"):
    print(f"  {k}: enabled={me.get(k)} visibility={mv.get(k)}")
'
done
