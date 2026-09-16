#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
cd /www/apps/strapi
cp /tmp/_backfill_invite12.js /www/apps/strapi/_backfill_invite12.js
node --max-old-space-size=512 /www/apps/strapi/_backfill_invite12.js 2>&1
rc=$?
rm -f /www/apps/strapi/_backfill_invite12.js
echo "BACKFILL_RC=$rc"
exit $rc