#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== 1. 重启后 sso_apps 白名单（验证未被重置） ==='
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
SELECT id, app_code, redirect_uris FROM sso_apps WHERE app_code IN ('course','default','wealth','e-joho-app') ORDER BY id;
SQL
echo ''
echo '=== 2. 直连微信回调验签(h.joho.cn) ==='
node /tmp/_wx_check_hjoho.js
echo ''
echo '=== 3. exchange-token 校验(用真实回调地址，应通过 validateRedirectUri) ==='
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
-- 直接复现 validateRedirectUri 逻辑：剥离 query 后与白名单匹配
SELECT app_code,
       'https://h.joho.cn/#/pages/sso/login-callback?return_url=xxx&app_code=course' AS test_uri,
       redirect_uris @> '["https://h.joho.cn/#/pages/sso/login-callback"]'::jsonb AS base_matches
FROM sso_apps WHERE app_code='course';
SQL
echo 'DONE'