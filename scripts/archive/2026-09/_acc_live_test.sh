#!/bin/bash
# 实时对照：DB 直查 inviter=2 关系排序 vs Strapi getLatestLandingAt 返回值
cd /www/apps/strapi
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"
QT="$PG -t -A"
SECRET=$(grep -E '^JWT_SECRET=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
TOKEN=$(node -e "const j=require('jsonwebtoken');process.env.SS='$SECRET';console.log(j.sign({id:2},process.env.SS,{algorithm:'HS256',expiresIn:'20m'}));")

echo "===== DB 时间 vs Strapi 时间 ====="
echo "db now(): $($QT -c 'SELECT now();')"
echo "db now() epoch: $($QT -c 'SELECT extract(epoch from now())*1000;')"

echo "===== 创建临时关系（inviter=2）====="
STAMP=$(date +%s)
TUSER_ID=$($QT -c "INSERT INTO sso_users(uuid,username,status,created_at,updated_at) VALUES ('live-$STAMP','live_test_invitee','virtual',now(),now()) RETURNING id;" | head -1)
REL_ID=$($QT -c "INSERT INTO sso_referral_relations(document_id,level,created_at,updated_at,published_at) VALUES ('live-rel-$STAMP',1,now(),now(),now()) RETURNING id;" | head -1)
INS_INV=$($QT -c "SELECT id FROM public.sso_invite_codes WHERE code='H57G54W7';" | head -1)
echo "temp invitee=$TUSER_ID relation=$REL_ID"
$QT -c "INSERT INTO public.sso_referral_relations_inviter_lnk(sso_referral_relation_id,sso_user_id) VALUES ($REL_ID,2);"
$QT -c "INSERT INTO public.sso_referral_relations_invitee_lnk(sso_referral_relation_id,sso_user_id) VALUES ($REL_ID,$TUSER_ID);"
$QT -c "INSERT INTO public.sso_referral_relations_invite_code_lnk(sso_referral_relation_id,sso_invite_code_id) VALUES ($REL_ID,$INS_INV);"

echo "===== DB 直查：inviter=2 全部关系按 created_at desc ====="
$QT -c "SELECT r.id, r.created_at, extract(epoch from r.created_at)*1000 AS ms FROM sso_referral_relations r JOIN sso_referral_relations_inviter_lnk l ON l.sso_referral_relation_id=r.id WHERE l.sso_user_id=2 ORDER BY r.created_at DESC;"

echo "===== status 返回 landedAt ====="
curl -s -m 15 "http://localhost:1337/api/zhao-point/v1/my/point/share/status" -H "Authorization: Bearer $TOKEN"
echo ""

echo "===== 清理临时数据 ====="
$QT -c "DELETE FROM public.sso_referral_relations_inviter_lnk WHERE sso_referral_relation_id=$REL_ID;"
$QT -c "DELETE FROM public.sso_referral_relations_invitee_lnk WHERE sso_referral_relation_id=$REL_ID;"
$QT -c "DELETE FROM public.sso_referral_relations_invite_code_lnk WHERE sso_referral_relation_id=$REL_ID;"
$QT -c "DELETE FROM public.sso_referral_relations WHERE id=$REL_ID;"
$QT -c "DELETE FROM public.sso_users WHERE id=$TUSER_ID;"
echo "DONE"