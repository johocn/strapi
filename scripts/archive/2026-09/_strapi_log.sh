#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
LOG=$(find /home/admin/.pm2/logs -name 'strapi-out*.log' | head -1)
echo "LOG=$LOG"
tail -n 60 "$LOG"