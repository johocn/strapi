#!/bin/bash
echo "=== strapi 与插件 config 访问器参考（zhao-able）==="
for p in zhao-wealth zhao-studio zhao-point; do
  echo "----- $p -----"
  grep -rnoE 'plugin\("zhao[^"]*"\)\.config\("[^"]*"\)' /www/apps/strapi/plugins/$p/dist/server/index.js 2>/dev/null | head -3
  grep -rnoE '\.config\("[A-Za-z0-9_.]+"\)' /www/apps/strapi/plugins/$p/dist/server/index.js 2>/dev/null | head -5
done
echo "=== package version ==="
grep -oE '"(strapi|@strapi/\w+)"[^,]*"([0-9][^"]*)"' /www/apps/strapi/package.json 2>/dev/null | head
echo DONE