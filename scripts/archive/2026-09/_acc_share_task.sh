#!/bin/bash
# 验收：share_article 走泛化分享领分（不再硬编码 activity_share）
# 只消费「临时新建落地」(id 最大)，不做二次领取，保护 id2 真实落地
cd /www/apps/strapi
PC="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi"
QT="$PC -t -A"
SECRET=$(grep -E '^JWT_SECRET=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
TOKEN=$(node -e "const j=require('jsonwebtoken');process.env.SS='$SECRET';console.log(j.sign({id:2},process.env.SS,{algorithm:'HS256',expiresIn:'25m'}));")

CST_NOW=$(date +"%Y-%m-%d %H:%M:%S.%6N")
CST_31=$(date -d '31 minutes ago' +"%Y-%m-%d %H:%M:%S.%6N")
H=http://localhost:1337/api/zhao-point/v1/my/point
bal() { curl -s -m 15 "$H/balance" -H "Authorization: Bearer $TOKEN"; }
sts() { curl -s -m 15 "$H/share/status?action=$1&dimType=$2&dimId=$3" -H "Authorization: Bearer $TOKEN"; }
earn() { curl -s -m 15 "$H/earn/share" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"action\":\"$1\",\"dimType\":\"$2\",\"dimId\":\"$3\"}"; }
pick() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const d=j.data??j;for(const k of ['$1','action','points','canClaim','orderId','id','waitNewLanding','hasLanding'])if(d&&d[k]!==undefined)console.log(k+'='+String(d[k]));}catch(e){console.log('PARSE_ERR '+s.slice(0,200))}});"; }

echo "===== [A] getTasks（期望出现 share_article/share_video）====="
curl -s -m 20 "$H/tasks" -H "Authorization: Bearer $TOKEN" -o /tmp/_tasks.json
node -e "let s=require('fs').readFileSync('/tmp/_tasks.json','utf8');try{const a=JSON.parse(s).data||[];for(const t of a)console.log(t.action+' | group='+(t.taskGroup||t.group||'')+' | taskId='+(t.taskId||t.id||''));console.log('TASK_COUNT='+a.length)}catch(e){console.log('PARSE_ERR '+s.slice(0,200))}"
DOC=$($QT -c "SELECT document_id FROM zhao_point_rules WHERE action='share_article';" | head -1)
echo "share_article document_id=$DOC"

echo "===== [B] 领取前余额 ====="; PRE=$(bal); echo "$PRE"
echo "===== [C] status(action=share_article) 只读，不消费任何落地（核心：应为 action=share_article, points=3）====="
S1=$(sts share_article task "$DOC"); echo "$S1" | pick "S1"

echo "===== [E] 造临时落地(created_at=31分钟前) ====="
CUR_MEM=$($QT -c "SELECT cm.id FROM zhao_channel_members cm JOIN public.zhao_channel_members_user_lnk l ON l.channel_member_id=cm.id WHERE l.user_id=2 AND cm.is_current=true LIMIT 1;" | head -1)
echo "channel_member(id2)=$CUR_MEM"
TUSER=$($QT -c "INSERT INTO sso_users(uuid,username,status,created_at,updated_at) VALUES ('acc-sa-$(date +%s)','acc_sa_invitee','virtual','$CST_NOW','$CST_NOW') RETURNING id;" | head -1)
REL=$($QT -c "INSERT INTO sso_referral_relations(document_id,level,created_at,updated_at,published_at) VALUES ('acc-sa-rel-$(date +%s)',1,'$CST_31','$CST_NOW','$CST_NOW') RETURNING id;" | head -1)
INV=$($QT -c "SELECT id FROM public.sso_invite_codes WHERE code='H57G54W7';" | head -1)
$QT -c "INSERT INTO public.sso_referral_relations_inviter_lnk(sso_referral_relation_id,sso_user_id) VALUES ($REL,2);"
$QT -c "INSERT INTO public.sso_referral_relations_invitee_lnk(sso_referral_relation_id,sso_user_id) VALUES ($REL,$TUSER);"
if [ -n "$INV" ]; then $QT -c "INSERT INTO public.sso_referral_relations_invite_code_lnk(sso_referral_relation_id,sso_invite_code_id) VALUES ($REL,$INV);"; fi
echo "TUSER=$TUSER REL=$REL INV=$INV"

echo "===== [F] status 有临时落地后 ====="; S2=$(sts share_article task "$DOC"); echo "canClaim 取自：$S2" | head -c 300; echo
echo "===== [G] earn(action=share_article)（期望 200 发分 +3, orderId=landing:$REL——证明过白名单且按 share_article 领分）====="
E1=$(earn share_article task "$DOC"); echo "$E1" | pick "E1"

echo "===== [I] 领后 status（只读）====="; S3=$(sts share_article task "$DOC"); echo "$S3" | pick "S3"
echo "===== [J] 领后余额 ====="; POST=$(bal); echo "$POST"

echo "===== [K] 还原 ====="
RID=$(echo "$E1" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const v=(j.data??j)?.id;process.stdout.write(/^\d+$/.test(String(v))?String(v):'')}catch(e){process.stdout.write('')}});")
echo "发分记录 id=$RID orderId=$(echo "$E1" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(String((JSON.parse(s).data??JSON.parse(s))?.orderId??''))}catch(e){process.stdout.write('')}});")"
if [ -n "$RID" ] && [ "$RID" != "" ]; then
  for t in zhao_point_records_channel_lnk zhao_point_records_operator_lnk zhao_point_records_user_channel_lnk zhao_point_records_user_lnk; do
    $QT -c "DELETE FROM public.$t WHERE point_record_id=$RID;"
  done
  $QT -c "DELETE FROM public.zhao_point_records WHERE id=$RID;"
fi
$QT -c "DELETE FROM public.sso_referral_relations_inviter_lnk WHERE sso_referral_relation_id=$REL;"
$QT -c "DELETE FROM public.sso_referral_relations_invitee_lnk WHERE sso_referral_relation_id=$REL;"
$QT -c "DELETE FROM public.sso_referral_relations_invite_code_lnk WHERE sso_referral_relation_id=$REL;"
$QT -c "DELETE FROM public.sso_referral_relations WHERE id=$REL;"
$QT -c "DELETE FROM public.sso_users WHERE id=$TUSER;"

echo "===== [L] 还原后余额（应=PRE）====="; AFTER=$(bal); echo "$AFTER"
echo "======== 摘要 ========"
echo "PRE=$PRE"
echo "S1(action/points 应=share_article/3): $S1"
echo "G : $E1"
echo "POST=$POST"
echo "AFTER=$AFTER"
echo "REL=$REL REC=$RID"
echo "DONE"