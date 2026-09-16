#!/bin/bash
LOG=/opt/1panel/apps/openresty/openresty/www/sites/v.joho.cn/log/access.log
echo "===== 是否请求过 sync-sso-profile ====="
grep -c "sync-sso-profile" "$LOG" || true
echo "===== 最近 sync-sso-profile 命中 ====="
grep "sync-sso-profile" "$LOG" | tail -10 || true
echo "===== 13:20-13:25 关键路径请求（auth-callback / exchange-token / wechat 回调 / 首页）====="
awk '$4 ~ /\[.*13:2[0-5]/' "$LOG" | grep -E "auth-callback|zhao-third/v1/third/callback|zhao-sso/v1/auth/exchange-token|/index.html|assets/index" | sed -E 's#HTTP/[0-9.]+" (200|301|302) [0-9]+.*##' | head -60
echo "===== 13:22-13:24 出现 401/403 的请求 ====="
awk '$4 ~ /\[.*13:2[2-4]/' "$LOG" | grep -E " 401 | 403 " | tail -20 || true
echo DONE