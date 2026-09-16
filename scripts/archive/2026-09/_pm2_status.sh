#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
pm2 ls 2>/dev/null
echo "--- strapi status ---"
pm2 jlist 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);[print(p['name'],'|',p['pm2_env']['status'],'| restarts:',p['pm2_env']['restart_time'],'| uptime:',p['pm2_env'].get('pm_uptime')) for p in d if p['name']=='strapi']"