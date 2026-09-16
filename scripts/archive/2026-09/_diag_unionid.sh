#!/bin/bash
cd /www/apps/strapi
echo "=== bindings 表:provider_data 里提取 unionid ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "
SELECT id, provider, provider_user_id,
       COALESCE(provider_union_id,'<NULL>') AS col_unionid,
       (provider_data::jsonb->>'unionid') AS data_unionid,
       (provider_data::jsonb->>'openid') AS data_openid,
       COALESCE(provider_nickname,'') AS nickname,
       created_at
FROM sso_third_party_bindings
ORDER BY id
LIMIT 30;"
echo DONE