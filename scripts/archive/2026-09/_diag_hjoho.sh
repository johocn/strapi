#!/bin/bash
# 1) 查 admin(id=1) zhao_roles；2) 查 h.joho.cn /api 反代返回
echo "===== admin zhao_roles ====="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -c "
SELECT u.id, u.username, u.email, u.zhao_roles FROM up_users u WHERE u.id = 1;
"
echo "===== h.joho.cn /api 探测 ====="
curl -s -o /dev/null -w "h.joho.cn/api/root: HTTP:%{http_code} size:%{size_download}\n" -H "Host: h.joho.cn" "http://127.0.0.1/api/"
curl -s -H "Host: h.joho.cn" "http://127.0.0.1/api/" | head -c 300; echo ""
echo "===== nginx 中 h.joho.cn 的 server 配置 ====="
grep -rl "h.joho.cn" /etc/nginx/conf.d/ /www/server/panel/vhost/nginx/ /www/server/nginx/conf/ 2>/dev/null | head -5
