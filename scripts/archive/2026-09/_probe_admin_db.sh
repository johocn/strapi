#!/bin/bash
echo "=== admin 用户(id=1) ==="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c \
"SELECT id, username, email, COALESCE(zhao_roles::text,'NULL') AS zhao_roles, COALESCE(sso_id::text,'NULL') AS sso_id FROM up_users WHERE id=1;"
echo ""
echo "=== zhao_permissions 中相关角色 ==="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c \
"SELECT role, permissions::text FROM zhao_permissions WHERE role IN ('channel-admin','point-manager','website-manager','point-editor','website-editor');"
echo ""
echo "=== up_roles 中 admin 相关 ==="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c \
"SELECT id, name, type FROM up_roles ORDER BY id;"
echo ""
echo "=== up_users_role_lnk id=1 ==="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c \
"SELECT * FROM up_users_role_lnk WHERE user_id=1;"
