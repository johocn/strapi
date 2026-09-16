#!/bin/bash
set -eo pipefail
# 准备邀请码链路实测环境：备份+清空埋点/归因表，确保观测干净
STAMP=$(date +%Y%m%d_%H%M%S)
BK="/home/admin/invite_probe_backup_${STAMP}"
mkdir -p "$BK"
BCTR="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
QCTR="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi"

echo "===== 备份前数据量 ====="
$QCTR -t -A -c "SELECT 'trace:'||count(*) FROM public.zhao_website_invite_traces;"
$QCTR -t -A -c "SELECT 'visit:'||count(*) FROM public.zhao_point_share_visits;"

echo "===== 备份两表 CSV 到 $BK ====="
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -c "COPY (SELECT * FROM public.zhao_website_invite_traces) TO STDOUT WITH CSV HEADER" > "$BK/invite_traces.csv"
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -c "COPY (SELECT * FROM public.zhao_point_share_visits) TO STDOUT WITH CSV HEADER" > "$BK/share_visits.csv"
echo "备份完成: $BK ($(wc -l < "$BK/invite_traces.csv") / $(wc -l < "$BK/share_visits.csv") 行)"

echo "===== 清空两表 ====="
$BCTR -c "DELETE FROM public.zhao_website_invite_traces;"
$BCTR -c "DELETE FROM public.zhao_point_share_visits;"

echo "===== 清空后状态 ====="
$QCTR -t -A -c "SELECT 'trace:'||count(*) FROM public.zhao_website_invite_traces;"
$QCTR -t -A -c "SELECT 'visit:'||count(*) FROM public.zhao_point_share_visits;"
echo "NOW=$(docker exec 1Panel-postgresql-pIe0 date -u '+%Y-%m-%d %H:%M:%S')"
echo "READY"