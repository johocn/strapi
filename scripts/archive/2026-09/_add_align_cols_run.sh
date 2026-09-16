#!/bin/bash
set -e
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:${PATH}
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -v ON_ERROR_STOP=1 < /tmp/add_upusers_align_cols.sql
echo "RC=$?"
echo DONE