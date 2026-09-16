#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -v ON_ERROR_STOP=1 <<'SQL'
ALTER TABLE up_users ADD COLUMN IF NOT EXISTS sso_id integer;
ALTER TABLE up_users ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE up_users ADD COLUMN IF NOT EXISTS avatar text;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='up_users' AND column_name IN ('sso_id','nickname','avatar') ORDER BY column_name;
SQL
echo "ADDCOL_RC=$?"