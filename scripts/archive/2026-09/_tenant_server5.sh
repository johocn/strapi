#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== 找"租户"可能对应的真实运营表：zhao-channel 或 zhao-site 里含 tenant 概念 ==='
SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
SQL
echo "DONE"