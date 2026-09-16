#!/bin/bash
set -eo pipefail
# 诊断邀请码埋点链路：id2 邀请码分发 (Z6AB6Z2D) 与 id4 落地，定位断点
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"

echo "===== [0] 埋点表结构 ====="
$PG "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='zhao_website_invite_traces' ORDER BY ordinal_position;"

echo ""
echo "===== [1] 埋点表总览（按 id 正序）====="
$PG "SELECT id, event, invite_code, inviter_id, page_path, logged_in, success, session_id, detail, created_at FROM public.zhao_website_invite_traces ORDER BY id;"

echo ""
echo "===== [2] 与 id2 邀请码 Z6AB6Z2D 或 inviter_id=2 相关 ====="
$PG "SELECT id, event, invite_code, stored_code, channel_invite_code, inviter_id, session_id, success, detail, created_at FROM public.zhao_website_invite_traces WHERE inviter_id='2' OR lower(invite_code)='z6ab6z2d' ORDER BY id;"

echo ""
echo "===== [3] id4 相关所有埋点 ====="
$PG "SELECT id, event, invite_code, inviter_id, session_id, success, detail, created_at FROM public.zhao_website_invite_traces WHERE inviter_id='4' ORDER BY id;"

echo ""
echo "===== [3b] userId(relation _lnk) 关联 user=2/4 的埋点 id ====="
$PG "SELECT l.invite_trace_id, l.user_id FROM public.zhao_website_invite_traces_users_lnk l WHERE l.user_id IN (2,4) ORDER BY l.invite_trace_id;"

echo ""
echo "===== [4] 各 sessionId 链路概览 ====="
$PG "SELECT session_id, string_agg(event || coalesce(':'||invite_code,''), ' -> ' ORDER BY id) AS chain, count(*) AS n, min(created_at) AS start FROM public.zhao_website_invite_traces GROUP BY session_id ORDER BY min(id);"

echo "DONE"