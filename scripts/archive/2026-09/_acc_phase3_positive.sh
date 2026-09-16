#!/bin/bash
# 受控验收 v3(修正版)：正向路径 —— 造临时邀约落地 → 验证可领 → 真实发分 → 完整还原（自清理）
cd /www/apps/strapi
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi"
QT="$PG -t -A"
SECRET=$(grep -E '^JWT_SECRET=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
TOKEN=$(node -e "const j=require('jsonwebtoken');process.env.SS='$SECRET';console.log(j.sign({id:2},process.env.SS,{algorithm:'HS256',expiresIn:'20m'}));")

bal() { curl -s -m 15 "http://localhost:1337/api/zhao-point/v1/my/point/balance" -H "Authorization: Bearer $TOKEN"; }

echo "===== [A] id2 领取前余额 ====="; PRE=$(bal); echo "$PRE"

echo "===== [B] 造临时落地（inviter=2, 临时 invitee, 码H57G54W7）====="
TUSER_ID=$($QT -c "INSERT INTO sso_users(uuid,username,status,created_at,updated_at) VALUES ('acc-$(date +%s)','acc_test_invitee','virtual',now(),now()) RETURNING id;" | head -1)
REL_ID=$($QT -c "INSERT INTO sso_referral_relations(document_id,level,created_at,updated_at,published_at) VALUES ('acc-rel-$(date +%s)',1,now(),now(),now()) RETURNING id;" | head -1)
INS_INV=$($QT -c "SELECT id FROM public.sso_invite_codes WHERE code='H57G54W7';" | head -1)
echo "临时 invitee=$TUSER_ID relation=$REL_ID code_id=$INS_INV"
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
RID=$(echo "$EARN" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const d=j.data??j;console.log(typeof d?.id!=='object'?d?.id:'')}catch(e){console.log('')}});")
echo "发分记录 id=$RID"
if [ -n "$RID" ] && [ "$RID" != "0" ]; then
  for t in $($QT -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'zhao_point_records_%_lnk';"); do
    if $QT -t -c "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='$t' AND column_name='point_record_id';" | grep -q point_record_id; then
      $QT -c "DELETE FROM public.$t WHERE point_record_id=$RID;"
    fi
  done
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