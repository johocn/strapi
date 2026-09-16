#!/bin/bash
LOG=/opt/1panel/apps/openresty/openresty/www/sites/h.joho.cn/log/access_ssl.log
echo "=== 39.144.247.13 requests today with status (dashboard load) ==="
grep "39.144.247.13" "$LOG" | grep -E '\[10/Sep/2026:12:19|\[10/Sep/2026:12:1[0-9]' | awk '{print $7, $9, $10}' | head -40
echo ""
echo "=== any 403/500 today ==="
grep -E '\[10/Sep/2026' "$LOG" | grep -E ' (403|500|502|503|404) ' | awk '{print $7, $9, $10}' | sort | uniq -c | sort -rn | head -20
