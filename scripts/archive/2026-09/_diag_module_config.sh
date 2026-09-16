#!/bin/bash
# 查 global-config 的 moduleEnabled / moduleTenantGrants / moduleVisibility，定位 website/points 为何 false
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -c "
SELECT id, document_id,
       COALESCE(module_enabled::text,'') AS module_enabled,
       COALESCE(module_tenant_grants::text,'') AS module_tenant_grants,
       COALESCE(module_visibility::text,'') AS module_visibility
FROM zhao_global_configs ORDER BY id;
"
echo "===== 站点列表 ====="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -c "
SELECT id, document_id, site_name, domain FROM zhao_site_configs ORDER BY id;
"
