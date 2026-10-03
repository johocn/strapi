#!/bin/bash
cd /www/apps/strapi/plugins/zhao-studio
SDK=$(ls -d ~/.npm/_npx/*/node_modules/@strapi/sdk-plugin 2>/dev/null | head -1)
rm -rf dist
NODE_OPTIONS="--max-old-space-size=800" timeout 180 node "$SDK/bin/strapi-plugin.js" build 2>&1 | tail -40
