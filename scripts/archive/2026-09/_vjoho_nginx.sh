#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== v.joho.cn 反代配置(location / 与 /api) ==='
grep -rl "v.joho.cn" /opt/1panel/apps/openresty/openresty/conf.d/ /opt/1panel/apps/openresty/openresty/www/ 2>/dev/null | head -5
find /opt/1panel -path '*v.joho*' -name '*.conf' 2>/dev/null | head -10
echo '=== 该配置文件里关于 /api 和 1337 的段落 ==='
for f in $(find /opt/1panel -path '*v.joho*' -name '*.conf' 2>/dev/null | head -3); do
  echo "----- $f -----"
  grep -nE 'server_name|listen|location /(api)?|proxy_pass|return|rewrite' "$f" 2>/dev/null | head -40
done
echo 'DONE'