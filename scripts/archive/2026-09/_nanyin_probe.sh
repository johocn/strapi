#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
echo "=== pm2 list ==="
pm2 list 2>/dev/null | head -20
echo "=== find strapi dir ==="
pm2 jlist 2>/dev/null | python3 -c "import sys,json; [print(p['name'], p['pm2_env'].get('pm_cwd')) for p in json.load(sys.stdin)]" 2>/dev/null
echo "=== /home/admin ==="
ls /home/admin
