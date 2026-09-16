#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"
$PG "SELECT column_name FROM information_schema.columns WHERE table_name='zhao_website_invite_traces' ORDER BY ordinal_position;"
echo ""
$PG "SELECT id,event,invite_code,stored_code,channel_invite_code,inviter_id,page_path,logged_in,success,detail,session_id,created_at FROM public.zhao_website_invite_traces ORDER BY id;"
echo "DONE"