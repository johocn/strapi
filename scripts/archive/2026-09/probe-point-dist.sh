#!/usr/bin/env bash
cd /www/apps/strapi/plugins/zhao-point
echo "=== git log (activity.ts) ==="
git log --oneline -3 -- server/src/services/activity.ts 2>/dev/null
echo "=== dist meetingTime + inviteCode present? ==="
grep -c "inviteCode=" dist/server/index.js
grep -o "meetingTime: .\{0,40\}" dist/server/index.js | head -2
echo "=== raw link line ==="
grep -o "promo?act=\${act.documentId}.\{0,60\}" dist/server/index.js | head -2