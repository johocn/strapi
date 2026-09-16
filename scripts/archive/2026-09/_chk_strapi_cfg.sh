#!/bin/bash
cd /www/apps/strapi
echo "=== find plugin registry source ==="
find node_modules/@strapi/strapi/dist -name '*.js' | xargs grep -ln 'config' 2>/dev/null | xargs grep -ln 'default' 2>/dev/null | grep -iE 'plugin|registry|loaders' | head
echo "=== search config accessor ==="
grep -rnE 'config\(resourceKey|config = |get config\(|\.config\b' node_modules/@strapi/strapi/dist/core/util 2>/dev/null | head
grep -rnE "config\(key\)" node_modules/@strapi/strapi/dist 2>/dev/null | head
echo "=== how plugin .config is defined ==="
grep -rnE "config" node_modules/@strapi/strapi/dist/core/loaders/plugins/*.js 2>/dev/null | head
echo DONE