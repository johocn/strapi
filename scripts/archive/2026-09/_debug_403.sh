#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== 库中 serverToken/token ==='
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
SELECT id, app_id, is_enabled,
       extra_config->>'serverToken' AS serverToken,
       extra_config->>'token' AS token,
       extra_config->>'encodingAESKey' AS aeskey
FROM sso_oauth_configs WHERE provider='wechat' AND app_type='official_account';
SQL
echo ''
echo '=== 再复测一次（排除偶发） ==='
node /tmp/_wx_check_hjoho.js
echo ''
echo '=== 检查 Strapi 日志中相关错误 ==='
export PM2_HOME=/home/admin/.pm2
pm2 logs strapi --lines 30 --nostream 2>/dev/null | grep -iE 'wechat|signature|oauth|error' | tail -20
echo 'DONE'