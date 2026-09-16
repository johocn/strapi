#!/bin/bash
D=$(date -u -d '8 minutes ago' +'%Y-%m-%d %H:%M:%S')
echo "===== [1] Strapi 最近错误日志（8min内）====="
grep -iE "error|exception|Cannot|TypeError" /home/admin/.pm2/logs/strapi-error.log 2>/dev/null | tail -15 || echo "(无错误日志文件)"

echo ""
echo "===== [2] share/status 未登录（应 401/403，非 404）====="
curl -s -m 15 -o /dev/null -w "share/status: HTTP %{http_code}\n" "https://v.joho.cn/api/zhao-point/v1/my/point/share/status"
echo "===== [3] earn/share 未登录（应 401/403）====="
curl -s -m 15 -o /dev/null -w "earn/share: HTTP %{http_code}\n" -X POST "https://v.joho.cn/api/zhao-point/v1/my/point/earn/share" -H 'Content-Type: application/json' -d '{}'

echo ""
echo "===== [4] 线上产物含新文案 ====="
W=/opt/1panel/apps/openresty/openresty/www/sites/v.joho.cn/index
f=$(ls $W/assets/share-guide.*.js 2>/dev/null | head -1)
echo "share-guide asset: ${f:-缺失}"
[ -n "$f" ] && grep -o "好友通过分享注册后\|等待好友注册\|邀约落地已超过" "$f" | sort -u
echo "DONE"