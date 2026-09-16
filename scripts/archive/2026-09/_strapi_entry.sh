#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== @strapi/strapi 主入口导出对象 ==='
node -e "const s=require('/www/apps/strapi/node_modules/@strapi/strapi'); console.log('type', typeof s); console.log('keys', Object.keys(s)); console.log('default type', typeof s.default); console.log('STrapi?', typeof s.Strapi);"
echo '=== 是否有旧版 smoke 脚本写法参考 ==='
ls -la /www/apps/strapi/*.js 2>/dev/null | head
ls -la /home/admin/*.js 2>/dev/null | head
echo 'DONE'