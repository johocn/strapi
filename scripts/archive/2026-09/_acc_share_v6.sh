#!/bin/bash
# 受控验收 v6（新规则：邀约落地满30分钟后可领、每次消耗一个落地、已领完需新落地）
# 造临时落地(CST墙上钟) → 未满30min: status冷却 + earn被POINT_020拦
#   → 落地created_at提前31min → status可领 + earn发分 + orderId=landing 消耗
#   → 再earn被POINT_025拦 + status等待新落地 → 完整还原
cd /www/apps/strapi
PC="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi"
QT="$PC -t -A"
SECRET=$(grep -E '^JWT_SECRET=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
TOKEN=$(node -e "const j=require('jsonwebtoken');process.env.SS='$SECRET';console.log(j.sign({id:2},process.env.SS,{algorithm:'HS256',expiresIn:'25m'}));")

CST_NOW=$(date +"%Y-%m-%d %H:%M:%S.%6N")
CST_31=$(date -d '31 minutes ago' +"%Y-%m-%d %H:%M:%S.%6N")
bal() { curl -s -m 15 "http://localhost:1337/api/zhao-point/v1/my/point/balance" -H "Authorization: Bearer $TOKEN"; }
status() { curl -s -m 15 "http://localhost:1337/api/zhao-point/v1/my/point/share/status" -H "Authorization: Bearer $TOKEN"; }
earn() { curl -s -m 15 "http://localhost:1337/api/zhao-point/v1/my/point/earn/share" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"action":"activity_share"}'; }

echo "===== [A] 领取前余额 ====="; PRE=$(bal); echo "$PRE"

echo "===== [B] 造临时落地(inviter=2, created_at=CST现在) ====="
CUR_MEM=$($QT -c "SELECT cm.id FROM zhao_channel_members cm JOIN public.zhao_channel_members_user_lnk l ON l.channel_member_id=cm.id WHERE l.user_id=2 AND cm.is_current=true LIMIT 1;" | head -1)
MEM=$CUR_MEM
CREATED_MEM=""
if [ -z "$CUR_MEM" ]; then
  MEM=$($QT -c "INSERT INTO zhao_channel_members(document_id,role,is_current,created_at,updated_at,published_at) VALUES ('acc-mem-$(date +%s)','member',true,'$CST_NOW','$CST_NOW','$CST_NOW') RETURNING id;" | head -1)
  $QT -c "INSERT INTO public.zhao_channel_members_user_lnk(channel_member_id,user_id) VALUES ($MEM,2);"
  $QT -c "INSERT INTO public.zhao_channel_members_channel_lnk(channel_member_id,channel_id) VALUES ($MEM,1);"
  CREATED_MEM="$MEM"
  echo "临时 channel member=$MEM"
else
  echo "复用已有当前渠道 member=$MEM"
fi

TUSER_ID=$($QT -c "INSERT INTO sso_users(uuid,username,status,created_at,updated_at) VALUES ('acc-$(date +%s)','acc_v6_invitee','virtual','$CST_NOW','$CST_NOW') RETURNING id;" | head -1)
REL_ID=$($QT -c "INSERT INTO sso_referral_relations(document_id,level,created_at,updated_at,published_at) VALUES ('acc-rel-$(date +%s)',1,'$CST_NOW','$CST_NOW','$CST_NOW') RETURNING id;" | head -1)
INS_INV=$($QT -c "SELECT id FROM public.sso_invite_codes WHERE code='H57G54W7';" | head -1)
$QT -c "INSERT INTO public.sso_referral_relations_inviter_lnk(sso_referral_relation_id,sso_user_id) VALUES ($REL_ID,2);"
$QT -c "INSERT INTO public.sso_referral_relations_invitee_lnk(sso_referral_relation_id,sso_user_id) VALUES ($REL_ID,$TUSER_ID);"
$QT -c "INSERT INTO public.sso_referral_relations_invite_code_lnk(sso_referral_relation_id,sso_invite_code_id) VALUES ($REL_ID,$INS_INV);"

echo "===== [C] 未满30min status（期望 canClaim=false, cooldown>0）====="; S1=$(status); echo "$S1"

echo "===== [D] earn（期望 POINT_020: 邀约落地满30分钟后可领取）====="; E1=$(earn); echo "$E1"

echo "===== [E] 落地created_at 提前31min ====="
$QT -c "UPDATE public.sso_referral_relations SET created_at='$CST_31', updated_at='$CST_NOW' WHERE id=$REL_ID;"

echo "===== [F] 满30min status（期望 canClaim=true）====="; S2=$(status); echo "$S2"

echo "===== [G] earn（期望 200 发分, orderId=landing:$REL_ID）====="; E2=$(earn); echo "$E2"

echo "===== [H] 再 earn（期望 POINT_025: 已领取过该好友注册的分享积分）====="; E3=$(earn); echo "$E3"

echo "===== [I] 领取后 status（期望 waitNewLanding=true, canClaim=false）====="; S3=$(status); echo "$S3"

echo "===== [J] 领取后余额（期望 +points）====="; POST=$(bal); echo "$POST"

echo "===== [K] 还原 ====="
RID=$(echo "$E2" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const d=j.data??j;const v=d?.id??'';console.log(/^\d+$/.test(String(v))?String(v):'')}catch(e){console.log('')}});")
echo "发分记录 id=$RID"
if [ -n "$RID" ]; then
  for t in zhao_point_records_user_lnk zhao_point_records_operator_lnk zhao_point_records_channel_lnk zhao_point_records_user_channel_lnk; do
    $QT -c "DELETE FROM public.$t WHERE point_record_id=$RID;"
  done
  $QT -c "DELETE FROM public.zhao_point_records WHERE id=$RID;"
fi
$QT -c "DELETE FROM public.sso_referral_relations_inviter_lnk WHERE sso_referral_relation_id=$REL_ID;"
$QT -c "DELETE FROM public.sso_referral_relations_invitee_lnk WHERE sso_referral_relation_id=$REL_ID;"
$QT -c "DELETE FROM public.sso_referral_relations_invite_code_lnk WHERE sso_referral_relation_id=$REL_ID;"
$QT -c "DELETE FROM public.sso_referral_relations WHERE id=$REL_ID;"
$QT -c "DELETE FROM public.sso_users WHERE id=$TUSER_ID;"
if [ -n "$CREATED_MEM" ]; then
  $QT -c "DELETE FROM public.zhao_channel_members_user_lnk WHERE channel_member_id=$CREATED_MEM;"
  $QT -c "DELETE FROM public.zhao_channel_members_channel_lnk WHERE channel_member_id=$CREATED_MEM;"
  $QT -c "DELETE FROM public.zhao_channel_members WHERE id=$CREATED_MEM;"
fi

echo "===== [L] 还原后余额（应=PRE）====="; AFTER=$(bal); echo "$AFTER"

echo "======== 摘要 ========"
echo "PRE : $PRE"
echo "C  : $S1"
echo "D  : $E1"
echo "F  : $S2"
echo "G  : $E2"
echo "H  : $E3"
echo "I  : $S3"
echo "POST: $POST"
echo "AFTER: $AFTER"
echo "MEM=$MEM CREATED_MEM=$CREATED_MEM REL=$REL_ID INV=$TUSER_ID REC=$RID"
echo "DONE"