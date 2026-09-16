#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
TS=$(date +%Y%m%d_%H%M%S)
mkdir -p /home/admin/site_extraconfig_backup
docker exec 1Panel-postgresql-pIe0 pg_dump -U strapi -d strapi -t zhao_site_configs --data-only > /home/admin/site_extraconfig_backup/zhao_site_configs_${TS}.dump 2>/dev/null
echo "BACKED_EXTRA_$TS bytes=$(wc -c < /home/admin/site_extraconfig_backup/zhao_site_configs_${TS}.dump)"