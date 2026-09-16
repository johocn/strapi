#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
# 在 pm2 吐出的日志里查 sync-sso-profile 相关
pm2 logs strapi --nostream --lines 8000 2>/dev/null | grep -iE "sync-sso-profile|syncSsoProfile|zhao-auth.*(err|fail|warn)" | tail -40
echo "===== 是否有 sync-sso-profile 命中 ====="
pm2 logs strapi --nostream --lines 8000 2>/dev/null | grep -c "sync-sso-profile" || true
echo "===== 最近 STRAPI 启动错误(截取) ====="
pm2 logs strapi --nostream --lines 200 2>/dev/null | grep -iE "error|fail" | tail -15
echo DONE