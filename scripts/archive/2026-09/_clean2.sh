#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"
$PG "TRUNCATE public.zhao_website_invite_traces RESTART IDENTITY CASCADE;"
$PG "TRUNCATE public.zhao_point_share_visits RESTART IDENTITY CASCADE;"
echo "===== 清理后基数 ====="
for t in zhao_website_invite_traces zhao_point_share_visits zhao_point_share_visits_inviter_lnk; do
  c=$(docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c "SELECT count(*) FROM public.$t;")
  echo "  $t: $c"
done
echo "DONE"