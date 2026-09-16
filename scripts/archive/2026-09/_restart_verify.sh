#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
pm2 restart strapi --update-env >/dev/null 2>&1
echo "RESTART_REQUESTED=$?"
sleep 12
echo '--- strapi status ---'
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT id, site_name, domain, document_id FROM zhao_site_configs ORDER BY id;" 2>/dev/null
echo 'DONE'