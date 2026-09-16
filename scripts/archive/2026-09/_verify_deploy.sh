#!/bin/bash
echo "=== live index.html assets ==="
grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' /opt/1panel/apps/openresty/openresty/www/sites/v.joho.cn/index/index.html
echo "=== 新 bundle 内修复标记 ==="
JS=$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' /opt/1panel/apps/openresty/openresty/www/sites/v.joho.cn/index/index.html | head -1)
grep -c "buildHomeShareLink" "/opt/1panel/apps/openresty/openresty/www/sites/v.joho.cn/index/assets/$JS" || true
echo "=== sso/up 序列与用户 ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "SELECT last_value FROM sso_users_id_seq; SELECT last_value FROM up_users_id_seq;"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -tAc "SELECT string_agg(id::text, ',') || ':' || string_agg(username, ',') FROM sso_users;"
echo DONE