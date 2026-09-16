#!/bin/bash
set -eo pipefail
# 备份并清空观测表，为下一次在线测试建立干净基线
STAMP=$(date +%Y%m%d_%H%M%S)
BK="/home/admin/online_test_backup_${STAMP}"
mkdir -p "$BK"
Q="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"

echo "===== 备份观测表 → $BK ====="
for t in zhao_website_invite_traces zhao_point_share_visits zhao_point_share_visits_inviter_lnk sso_invite_usages sso_referral_relations; do
  docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c "COPY public.$t TO STDOUT WITH CSV HEADER" > "$BK/$t.csv" 2>/dev/null && echo "备份: $t ($(wc -l < "$BK/$t.csv") 行)" || echo "备份跳过: $t"
done

echo ""
echo "===== 清空 trace 与 visit（保留 referral/usage 现状 0）====="
$Q "TRUNCATE public.zhao_website_invite_traces RESTART IDENTITY;"
$Q "TRUNCATE public.zhao_point_share_visits RESTART IDENTITY CASCADE;"

echo ""
echo "===== 清理后数据量 ====="
for t in zhao_website_invite_traces zhao_point_share_visits zhao_point_share_visits_inviter_lnk; do
  c=$(docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c "SELECT count(*) FROM public.$t;")
  echo "  $t: $c"
done
echo "DONE"