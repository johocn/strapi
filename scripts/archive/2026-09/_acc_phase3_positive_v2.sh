#!/bin/bash
# 受控验收 v4(修正版)：正向路径 —— 造临时邀约落地 → 验证可领 → 真实发分 → 完整还原（自清理）
# v2 修正：临时关系 created_at 用【服务器 CST 墙钟】而非 DB now()（UTC），避免无时区列被 Strapi 当 CST 解析造成 8h 偏移误判过期
cd /www/apps/strapi
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi"
QT="$PG -t -A"
SECRET=$(grep -E '^JWT_SECRET=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
TOKEN=$(node -e "const j=require('jsonwebtoken');process.env.SS='$SECRET';console.log(j.sign({id:2},process.env.SS,{algorithm:'HS256',expiresIn:'20m'}));")

# 服务器 CST 墙钟（与 Strapi 进程时区一致），精度毫秒
CST_NOW=$(date +"%Y-%m-%d %H:%M:%S.%6N")

bal() { curl -s -m 15 "http://localhost:1337/api/zhao-point/v1/my/point/balance" -H "Authorization: Bearer $TOKEN"; }

echo "===== [A] id2 领取前余额 ====="; PRE=$(bal); echo "$PRE"

echo "===== [B] 造临时落地（inviter=2, 临时 invitee, 码H57G54W7, created_at=CST）====="
TUSER_ID=$($QT -c "INSERT INTO sso_users(uuid,username,status,created_at,updated_at) VALUES ('acc-$(date +%s)','acc_test_invitee','virtual','$CST_NOW','$CST_NOW') RETURNING id;" | head -1)
REL_ID=$($QT -c "INSERT INTO sso_referral_relations(document_id,level,created_at,updated_at,published_at) VALUES ('acc-rel-$(date +%s)',1,'$CST_NOW','$CST_NOW','$CST_NOW') RETURNING id;" | head -1)
INS_INV=$($QT -c "SELECT id FROM public.sso_invite_codes WHERE code='H57G54W7';" | head -1)
echo "CST_NOW=$CST_NOW 临时 invitee=$TUSER_ID relation=$REL_ID code_id=$INS_INV"
$QT -c "INSERT INTO public.sso_referral_relations_inviter_lnk(sso_referral_relation_id,sso_user_id) VALUES ($REL_ID,2);"
$QT -c "INSERT INTO public.sso_referral_relations_invitee_lnk(sso_referral_relation_id,sso_user_id) VALUES ($REL_ID,$TUSER_ID);"
$QT -c "INSERT INTO public.sso_referral_relations_invite_code_lnk(sso_referral_relation_id,sso_invite_code_id) VALUES ($REL_ID,$INS_INV);"

echo "===== [C] id2 share/status（期望 canClaim=true 且 landedAt≈现在）====="
STATUS=$(curl -s -m 15 "http://localhost:1337/api/zhao-point/v1/my/point/share/status" -H "Authorization: Bearer $TOKEN")
echo "$STATUS"

echo "===== [D] id2 earn/share（期望 200 发分）====="
EARN=$(curl -s -m 15 "http://localhost:1337/api/zhao-point/v1/my/point/earn/share" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"action":"activity_share"}')
echo "$EARN"

echo "===== [E] 领取后余额 ====="; POST=$(bal); echo "$POST"

echo "===== [F] 还原：删本次发分记录 + 临时落地 ====="
RID=$(echo "$EARN" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const d=j.data??j;const v=d?.id??'';console.log(/^\d+$/.test(String(v))?String(v):'')}catch(e){console.log('')}});")
echo "发分记录 id=$RID"
if [ -n "$RID" ]; then
  $QT -c "DELETE FROM public.zhao_point_records_user_lnk WHERE point_record_id=$RID;"
  $QT -c "DELETE FROM public.zhao_point_records_operator_lnk WHERE point_record_id=$RID;"
  $QT -c "DELETE FROM public.zhao_point_records_channel_lnk WHERE point_record_id=$RID;"
  $QT -c "DELETE FROM public.zhao_point_records_user_channel_lnk WHERE point_record_id=$RID;"
  $QT -c "DELETE FROM public.zhao_point_records WHERE id=$RID;"
fi
$QT -c "DELETE FROM public.sso_referral_relations_inviter_lnk WHERE sso_referral_relation_id=$REL_ID;"
$QT -c "DELETE FROM public.sso_referral_relations_invitee_lnk WHERE sso_referral_relation_id=$REL_ID;"
$QT -c "DELETE FROM public.sso_referral_relations_invite_code_lnk WHERE sso_referral_relation_id=$REL_ID;"
$QT -c "DELETE FROM public.sso_referral_relations WHERE id=$REL_ID;"
$QT -c "DELETE FROM public.sso_users WHERE id=$TUSER_ID;"

echo "===== [G] 还原后余额（应=PRE）====="; AFTER=$(bal); echo "$AFTER"
echo "======== 摘要 ========"
echo "PRE  : $PRE"
echo "STATUS: $STATUS"
echo "EARN : $EARN"
echo "POST : $POST"
echo "AFTER: $AFTER"
echo "REC=$RID REL=$REL_ID INV=$TUSER_ID"
echo "DONE"