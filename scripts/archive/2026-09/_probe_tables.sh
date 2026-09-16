#!/bin/bash
echo "--- up_users 表结构（admin id=1） ---"
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c \
"SELECT column_name FROM information_schema.columns WHERE table_name='up_users' ORDER BY ordinal_position;"
echo ""
echo "--- zhao 相关 permission 表 ---"
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c \
"SELECT tablename FROM pg_tables WHERE tablename LIKE '%permission%' OR tablename LIKE '%role%' ORDER BY tablename;"
