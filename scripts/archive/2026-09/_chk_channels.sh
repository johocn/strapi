#!/bin/bash
cd /www/apps/strapi
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c "SELECT id,name,code,channel_tier,status FROM zhao_channels ORDER BY id asc;"
echo DONE