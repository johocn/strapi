#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== .env 真实 DATABASE_HOST/PORT/NAME/USER ==='
grep -iE '^DATABASE_(HOST|PORT|NAME|USERNAME|CLIENT|SSL)=' /www/apps/strapi/.env
echo ''
echo '=== postgres 容器实际端口映射到宿主机 ==='
docker ps --filter "name=postgresql" --format "{{.Names}} {{.Ports}}"
echo '=== 所有监听 postgres 的端口 ==='
ss -ltnp 2>/dev/null | grep -iE '5432|5433|postgres'
echo 'DONE'