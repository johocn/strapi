#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
TS=$(date +%Y%m%d_%H%M%S)
mkdir -p /home/admin/site_oauth_backup
docker exec 1Panel-postgresql-pIe0 pg_dump -U strapi -d strapi -t sso_oauth_configs --data-only > /home/admin/site_oauth_backup/sso_oauth_configs_pre_creds_${TS}.dump 2>/dev/null
echo "BACKED_$TS bytes=$(wc -c < /home/admin/site_oauth_backup/sso_oauth_configs_pre_creds_${TS}.dump)"