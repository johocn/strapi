#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
echo '=== pm2.1(strapi) 完整启动命令行 ==='
pm2 describe 1 2>/dev/null | grep -iE 'script|args|interpreter|exec cwd|node args|env:' | head -20
echo ''
echo '=== pm2 保存的 env 里 NODE_OPTIONS/TS 相关 ==='
pm2 env 1 2>/dev/null | grep -iE 'NODE_OPTIONS|TS_NODE|tsup|esbuild|register|LOADER|STRAPI' | head
echo ''
echo '=== root dist 是否存在已编译的 config ==='
ls /www/apps/strapi/dist/config/ 2>/dev/null | head
ls -la /www/apps/strapi/dist/ 2>/dev/null | head -20
echo 'DONE'