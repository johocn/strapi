#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
mkdir -p /home/admin/site_pre_restore
TS=$(date +%Y%m%d_%H%M%S)
for t in zhao_site_configs zhao_site_configs_template_lnk zhao_channels_sites_lnk zhao_channels; do
  docker exec 1Panel-postgresql-pIe0 pg_dump -U strapi -d strapi -t $t > /home/admin/site_pre_restore/${t}_${TS}.dump 2>/dev/null
  echo "backed ${t} -> $(wc -c < /home/admin/site_pre_restore/${t}_${TS}.dump) bytes"
done
echo "BACKUP_DONE=$TS"