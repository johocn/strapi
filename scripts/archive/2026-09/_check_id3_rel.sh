#!/bin/bash
set -eo pipefail

echo "===== sso_referral_relations 相关表清单 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%referral%' OR table_name LIKE '%invite_usage%'"

echo ""
echo "===== referral_relations 主表结构 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('sso_referral_relations','sso_invite_usages') ORDER BY table_name,column_name"

echo ""
echo "===== referral _lnk 中间表 ====="
for t in sso_referral_relations_inviter_lnk sso_referral_relations_invitee_lnk; do
  echo "-- $t --"
  docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM $t" 2>&1 || echo "  (不存在)"
done

echo ""
echo "===== referral_relations 全表 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_referral_relations"
echo ""
echo "===== invite_usages 全表 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_invite_usages"
echo ""
echo "===== 涉及 id=3 的所有 referral/invite 关系 ====="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_referral_relations_inviter_lnk WHERE inviter_id=3 OR entity_id=3"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT * FROM sso_referral_relations_invitee_lnk WHERE invitee_id=3 OR entity_id=3"