#!/bin/bash
# 查看 admin(id=1) 的用户角色配置
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c \
"SELECT id, username, email, COALESCE(zhao_roles::text, 'NULL') AS zhao_roles, COALESCE(role, 'NULL') AS role FROM up_users WHERE id=1;"
echo "--- permission 表中 channel-admin 角色记录 ---"
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c \
"SELECT role, permissions::text FROM zhao_auth_permissions WHERE role IN ('channel-admin','point-manager','website-manager');"
