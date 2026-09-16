#!/bin/bash
set -e
PW=$(grep '^DATABASE_PASSWORD=' /www/apps/strapi/.env | cut -d= -f2)
export PGPASSWORD="$PW"
echo "== sso_users id2 nickname/avatar =="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -F"|" -c "SELECT id, username, nickname, avatar_url FROM sso_users WHERE id=2 OR id IN (6,7);"
echo "== 所有 sso_users 的 nickname 非空者 =="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -F"|" -c "SELECT id, username, COALESCE(nickname,'(空)') AS nickname FROM sso_users ORDER BY id;"
echo "== 第三方绑定 nickname =="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -F"|" -c "SELECT user_id, provider, provider_nickname FROM sso_third_party_bindings ORDER BY user_id;"