#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
pm2 restart strapi --silent
sleep 4
echo "--- pm2 status ---"
pm2 jlist 2>/dev/null | head -c 1500
echo ""
echo "RESTART_DONE"