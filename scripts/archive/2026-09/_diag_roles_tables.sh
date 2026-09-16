#!/bin/bash
# 查角色相关表名 + zhao 用户的角色/渠道关联
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -c "
SELECT tablename FROM pg_tables
WHERE tablename LIKE '%role%' OR tablename LIKE '%users_permissions%'
ORDER BY tablename;
"
echo "=========="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -c "
SELECT u.id, u.username, u.zhao_roles FROM up_users u WHERE u.username ILIKE '%zhao%';
"
