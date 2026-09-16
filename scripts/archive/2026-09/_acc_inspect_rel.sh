#!/bin/bash
PG="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c"
echo "===== 临时 relation id=5 的 lnk 挂载 ====="
$PG "SELECT l.sso_referral_relation_id,l.sso_user_id,r.created_at FROM sso_referral_relations_inviter_lnk l JOIN sso_referral_relations r ON r.id=l.sso_referral_relation_id WHERE l.sso_user_id=2 ORDER BY r.created_at DESC;"
echo "===== 按 inviter=2 的最新 relation（Strapi where inviter id=2）====="
$PG "SELECT DISTINCT r.id,r.level,r.created_at FROM sso_referral_relations r JOIN sso_referral_relations_inviter_lnk l ON l.sso_referral_relation_id=r.id WHERE l.sso_user_id=2 ORDER BY r.created_at DESC LIMIT 5;"
echo "===== relation id=5 自身 ====="
$PG "SELECT id,document_id,level,created_at FROM sso_referral_relations WHERE id=5;"