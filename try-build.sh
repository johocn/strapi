#!/bin/bash
cd /www/apps/strapi
export NVM_DIR="/home/admin/.nvm"
source "$NVM_DIR/nvm.sh"

echo "=== 1. 查 @strapi/sdk-plugin ==="
ls -la node_modules/@strapi/sdk-plugin/package.json 2>/dev/null
cat node_modules/@strapi/sdk-plugin/package.json 2>/dev/null | grep -E '"(bin|scripts)"' -A5 | head -10

echo ""
echo "=== 2. npx @strapi/sdk-plugin --help ==="
NODE_OPTIONS="--max-old-space-size=256" timeout 10 npx @strapi/sdk-plugin build --help 2>&1 | head -10

echo ""
echo "=== 3. 尝试在 plugin dir build server  only ==="
cd plugins/zhao-studio
# Strapi sdk-plugin 内部用 Vite，让我们直接用 esbuild 打包 server
NODE_OPTIONS="--max-old-space-size=512" timeout 120 npx esbuild server/src/index.ts \
  --bundle --platform=node --target=node18 \
  --outfile=dist/server/index.js --format=cjs --minify \
  --external:bull --external:ioredis --external:@strapi/strapi --external:@strapi/sdk-plugin \
  2>&1 | tail -15
echo "exit=$?"
cd /www/apps/strapi

echo ""
echo "=== 4. verify new dist ==="
ls -la plugins/zhao-studio/dist/server/index.js 2>/dev/null
grep -c "createSchedule\|publish/preview\|douyin-schema\|platforms" plugins/zhao-studio/dist/server/index.js 2>/dev/null
