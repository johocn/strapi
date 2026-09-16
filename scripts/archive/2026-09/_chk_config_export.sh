#!/bin/bash
f=/www/apps/strapi/plugins/zhao-point/dist/server/index.js
echo "=== how config is exported/used ==="
grep -nE 'config\$1|config:|config =|register:' "$f" | head -30
echo "=== plugin export tail (config reference) ==="
grep -nE 'default: ?\{|config' "$f" | tail -20
echo DONE