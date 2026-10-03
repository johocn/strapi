#!/bin/bash
cd /www/apps/strapi

echo "=== 1. plugin dist grep createSchedule ==="
grep -o '.createSchedule[^,}]*' plugins/zhao-studio/dist/server/index.js | head -5
echo ""
echo "=== 2. plugin dist grep findAll existing methods ==="
grep -o 'async [a-zA-Z]*(' plugins/zhao-studio/dist/server/index.js | sort -u | head -30
echo ""
echo "=== 3. plugin dist grep controller publish section ==="
grep -o 'publish.*:.*{' plugins/zhao-studio/dist/server/index.js | head -5
echo ""
echo "=== 4. full text around createSchedule ==="
grep -o '.\{50\}createSchedule.\{50\}' plugins/zhao-studio/dist/server/index.js | head -5
