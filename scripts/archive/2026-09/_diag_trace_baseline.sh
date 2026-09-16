#!/bin/bash
set -eo pipefail
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c"
echo -n "TRACE_BASE "
$PG "SELECT count(*)||':'||coalesce(max(id)::text,'0') FROM public.zhao_website_invite_traces;"
echo -n "VISIT_BASE "
$PG "SELECT count(*)||':'||coalesce(max(id)::text,'0') FROM public.zhao_point_share_visits;"
echo "---trace rows---"
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT id,event,invite_code,inviter_id,session_id,created_at FROM public.zhao_website_invite_traces ORDER BY id LIMIT 30;"
echo "---visit rows---"
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT id,target_type,target_id,created_at FROM public.zhao_point_share_visits ORDER BY id LIMIT 30;"
echo "DONE"