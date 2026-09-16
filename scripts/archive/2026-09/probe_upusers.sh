#!/bin/bash
set -e
PW=$(grep '^DATABASE_PASSWORD=' /www/apps/strapi/.env | cut -d= -f2)
export PGPASSWORD="$PW"
echo "== up_users 列 =="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -F"|" -c "SELECT column_name FROM information_schema.columns WHERE table_name='up_users' ORDER BY ordinal_position;"
echo "== up_users id2 值 =="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -F"|" -c "SELECT id, username, email, provider FROM up_users WHERE id=2;"