#!/bin/bash
cd /www/apps/strapi

echo "=== 1. Check routes in dist ==="
grep -c "content-api" plugins/zhao-studio/dist/server/index.js
grep -c "router" plugins/zhao-studio/dist/server/index.js
grep -c "routes" plugins/zhao-studio/dist/server/index.js

echo ""
echo "=== 2. Check exports ==="
grep -o "module.exports.[a-zA-Z]*" plugins/zhao-studio/dist/server/index.js | head -10
grep -o "exports.[a-zA-Z]*" plugins/zhao-studio/dist/server/index.js | head -10

echo ""
echo "=== 3. Check initStudioQueues (esbuild minified it) ==="
grep -o "initStudioQueues[a-zA-Z]*" plugins/zhao-studio/dist/server/index.js | head -5
# 找 Queue 构造
grep -c "bull" plugins/zhao-studio/dist/server/index.js
grep -c "new Queue" plugins/zhao-studio/dist/server/index.js

echo ""
echo "=== 4. Try npx strapi-plugin from npx cache ==="
# 刚才 npx @strapi/sdk-plugin 装到了 ~/.npm/_npx
find ~/.npm -name "strapi-plugin" -type f 2>/dev/null | head -3
find ~/.npm -path "*sdk-plugin*" -name "*.js" 2>/dev/null | head -5

echo ""
echo "=== 5. Try full strapi-plugin build ==="
cd plugins/zhao-studio
# 用 npx cache 里的
NODE_OPTIONS="--max-old-space-size=512" timeout 180 ~/.npm/_npx/*/node_modules/@strapi/sdk-plugin/bin/strapi-plugin.js build 2>&1 | tail -15 || echo "npx path not found"

# 或者直接用 npx
NODE_OPTIONS="--max-old-space-size=512" timeout 180 npx strapi-plugin build 2>&1 | tail -15
echo "exit=$?"
cd /www/apps/strapi

echo ""
echo "=== 6. verify ==="
ls -la plugins/zhao-studio/dist/server/index.js
