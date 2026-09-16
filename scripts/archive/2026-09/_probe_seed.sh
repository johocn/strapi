#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== strapi-out.log 本次启动的开头（找到 13:00 启动的行，看前面有没有 version/迁移/重建提示） ==='
grep -nE '2026-09-03 13:0[0-3]' /home/admin/.pm2/logs/strapi-out.log | head -40
echo ''
echo '=== 启动段全文：11:50~13:01 之间的关键行 ==='
grep -nE '2026-09-03 1[12]:|2026-09-03 13:0[0-2]' /home/admin/.pm2/logs/strapi-out.log | grep -iE 'start|bootstrap|seed|restore|migrat|schema|flush|reset|clear|create default|root|site' | head -60