#!/bin/bash
f=/www/apps/strapi/plugins/zhao-point/dist/server/index.js
echo "=== bootstrap seed function in dist ==="
grep -nE '插件已加载，开始种子|种子数据失败|积分规则已完整|已种子|existingRules|existingActions' "$f"
echo "--- context around bootstrap def ---"
ln=$(grep -n '插件已加载' "$f" | head -1 | cut -d: -f1)
echo "line=$ln"
START=$((ln-15)); END=$((ln+45))
sed -n "${START},${END}p" "$f"
echo DONE