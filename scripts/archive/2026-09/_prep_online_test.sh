#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"
W=/opt/1panel/apps/openresty/openresty/www/sites/v.joho.cn

echo "===== 线上 index.html 引用的主要 asset（含 share / index / exchange）====="
grep -oE '(assets/[A-Za-z0-9._-]+\.(js|css))' "$W/index/index.html" 2>/dev/null | grep -iE 'share|index|exchange|uni-app' | sort -u

echo ""
echo "===== 关键 asset 是否含诊断埋点 ====="
for f in share.BqIzoCg8.js index-DH_d_JdV.js; do
  p=$(ls "$W/index/assets/$f" 2>/dev/null)
  echo "--- $f: ${p:-缺失} ---"
  if [ -n "$p" ]; then
    for kw in configShareWithInvite debug_share share_sent invite-flow; do
      c=$(grep -o "$kw" "$p" | head -1)
      [ -n "$c" ] && echo "    含: $kw"
    done
  fi
done

echo ""
echo "===== 埋点接口可达性（反代）====="
curl -s -m 15 -o /dev/null -w "invite-flow/track: HTTP %{http_code}\n" -X POST "https://v.joho.cn/api/zhao-website/v1/invite-flow/track" -H 'Content-Type: application/json' -H 'Origin: https://v.joho.cn' -d '{"event":"env_ready_check"}'

echo ""
echo "===== SIGNATURE 接口可达性 ====="
curl -s -m 15 -o /dev/null -w "jssdk-signature: HTTP %{http_code}\n" -X POST "https://v.joho.cn/api/zhao-third/v1/third/jssdk-signature?domain=v.joho.cn" -H 'Content-Type: application/json' -H 'Origin: https://v.joho.cn' -d '{"url":"https://v.joho.cn/"}'

echo ""
echo "===== 清理观测表前数据量 ====="
$PG "SELECT 'trace:'||count(*) FROM public.zhao_website_invite_traces;" 
$PG "SELECT 'visit:'||count(*) FROM public.zhao_point_share_visits;"
$PG "SELECT 'referral:'||count(*) FROM public.sso_referral_relations;"
$PG "SELECT 'usage:'||count(*) FROM public.sso_invite_usages;"

echo "DONE"