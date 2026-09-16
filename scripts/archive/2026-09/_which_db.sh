#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== .env 数据库连接 ==='
grep -iE 'DATABASE|DB_' /www/apps/strapi/.env | sed -E 's/(PASSWORD|HOST|USER)=.*/\1=***/' 
echo ''
echo '=== config/database 解析出的连接 ==='
grep -niE 'client|host|port|database|username|password|ssl' /www/apps/strapi/config/database.* 2>/dev/null | sed -E 's/(password).*/\1=***/' | head -30
echo ''
echo '=== psql 所在库名确认（strapi）==='
docker exec 1Panel-postgresql-pIe0 psql -U strapi -l 2>/dev/null | head -10
echo 'DONE'