#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
F=/opt/1panel/apps/openresty/openresty/conf/conf.d/v.joho.cn.conf
echo '=== 443 /api/ 完整块 + 该块 proxy 段 ==='
awk '/listen 443/{p=1} p' "$F" | awk '/location \/api\//{f=1} f{print} /location \/{/{f=0}' | head -30
echo ''
echo '=== 443 location / 及下方 proxy 到静态/catch-all 段 ==='
awk '/listen 443/{p=1} p' "$F" | awk '/location \{/{f=1} f{print}' | head -30
echo ''
echo '=== 文件行号: 443 的 /api/, location / 起始 ==='
grep -nE 'listen 443|location /api/|location /' "$F" | tail -20
echo 'DONE'