#!/bin/bash
cd /www/apps/strapi
echo "=== initStudioQueues 函数体 ==="
# 找到 initStudioQueues 第一次出现位置，打印 20 行
LINE=$(grep -n "async function initStudioQueues" plugins/zhao-studio/dist/server/index.js | head -1 | cut -d: -f1)
if [ -z "$LINE" ]; then
  LINE=$(grep -n "initStudioQueues=async" plugins/zhao-studio/dist/server/index.js | head -1 | cut -d: -f1)
fi
echo "found at line: $LINE"
if [ -n "$LINE" ]; then
  END=$((LINE + 30))
  sed -n "${LINE},${END}p" plugins/zhao-studio/dist/server/index.js
fi
