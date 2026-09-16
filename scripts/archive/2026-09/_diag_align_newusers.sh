#!/bin/bash
# 校验最新 SSO 用户：sso/up_users id 对齐、专属邀请码、分销关系
cd /www/apps/strapi
PSQL="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off"

echo "===== 1. sso_users 最新 5 个 ====="
$PSQL -c "SELECT id, username, status, invite_code_used, invited_by FROM sso_users ORDER BY id DESC LIMIT 5;"

echo "===== 2. up_users 最新 5 个（对齐字段）====="
$PSQL -c "SELECT id, username, email, sso_id, nickname, invite_code FROM up_users ORDER BY id DESC LIMIT 10;"

echo "===== 3. sso_invite_codes 最新 8 个（专属邀请码）====="
$PSQL -c "SELECT id, code, app_code, invite_type, use_count, is_active, creator_lnk FROM sso_invite_codes ORDER BY id DESC LIMIT 8;"
$PSQL -c "SELECT * FROM sso_invite_codes_creator_lnk ORDER BY id DESC LIMIT 8;"

echo "===== 4. sso_referral_relations 最新 8 个 ====="
$PSQL -c "SELECT * FROM sso_referral_relations ORDER BY id DESC LIMIT 8;"
$PSQL -c "SELECT * FROM sso_referral_relations_inviter_lnk ORDER BY id DESC LIMIT 8;"
$PSQL -c "SELECT * FROM sso_referral_relations_invitee_lnk ORDER BY id DESC LIMIT 8;"

echo "===== 5. sso_invite_usages 最新 8 个 ====="
$PSQL -c "SELECT * FROM sso_invite_usages ORDER BY id DESC LIMIT 8;"
$PSQL -c "SELECT * FROM sso_invite_usages_user_lnk ORDER BY id DESC LIMIT 8;"

echo "===== 6. 财务核对：sso(14|15) 与 up_users(14|15) 邀请码 ====="
$PSQL -c "SELECT s.id AS sso_id, s.username AS sso_user, up.id AS upid, up.invite_code AS up_invite FROM sso_users s FULL JOIN up_users up ON s.id=up.id WHERE s.id IN (14,15) OR up.id IN (14,15);"
echo DONE