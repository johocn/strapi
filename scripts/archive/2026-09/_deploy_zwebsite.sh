#!/bin/bash
set -uo pipefail
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
cd /www/apps/strapi
STAMP=$(date +%Y%m%d_%H%M%S)
BKDIR=/home/admin/prod_course_patch_$STAMP
mkdir -p "$BKDIR"

echo "=== 备份生产 zhao-course 本地改动为补丁 -> $BKDIR ==="
git diff -- plugins/zhao-course > "$BKDIR/course_local.diff" || echo "no diff"
cp plugins/zhao-course/server/src/services/vendure-profile.ts "$BKDIR/vendure-profile.ts" 2>/dev/null && echo "vendure-profile.ts backed up" || echo "(vendure-profile not present)"
echo "=== stash 全部本地改动(含未跟踪) ==="
git stash push --include-untracked -m "deploy-zwebsite-$STAMP" plugins/zhao-course 2>&1
echo "=== stash list ==="
git stash list
echo "=== pull ==="
git pull origin main 2>&1
echo "=== after: $(git log --oneline -1) ==="
echo "=== dist 校验 ==="
if grep -q 'DATETIME_FIELDS' plugins/zhao-website/dist/server/index.js; then echo "DIST_DATETIME_FIX=OK"; else echo "DIST_DATETIME_FIX=MISSING"; fi
echo "=== pm2 restart ==="
pm2 restart strapi >/dev/null 2>&1 && echo "PM2_RESTART_OK"
sleep 6
pm2 list | grep strapi | head -3
echo "DONE"