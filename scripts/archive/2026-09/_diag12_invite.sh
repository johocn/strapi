#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
DB(){ docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "$1"; }
echo '=== 0. 相关表的列(确认字段名) ==='
for t in sso_invite_codes sso_referral_relations sso_invite_usages; do
 echo "--- $t ---"; DB "SELECT column_name FROM information_schema.columns WHERE table_name='$t' ORDER BY ordinal_position;" | head -30
done
echo '=== 1. sso_users 12 invite 相关字段 ==='
DB "SELECT id, COALESCE(invite_code_used,'<>') invite_code_used, is_referee, is_invited, referee_id, channel_code FROM sso_users WHERE id=12;" 2>&1
echo '=== 2. sso_invite_codes 表里有 12 创建的码/或用到的码 ==='
DB "SELECT c.id, COALESCE(c.code,'') code, COALESCE(c.campaign,'') campaign, c.is_active, c.created_at::text FROM sso_invite_codes c WHERE c.owner_id=12 OR c.creator=12 OR c.user=12;" 2>&1
echo '=== 3. 全库 invite_codes 看结构 ==='
DB "SELECT id, COALESCE(code,'') code, is_active FROM sso_invite_codes LIMIT 5;" 2>&1
echo 'DONE'