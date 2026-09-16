#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
DB(){ docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "$1"; }
echo '=== 12号邀请码(含creator关联) ==='
DB "SELECT c.id, c.code, c.app_code, c.invite_type, c.is_active, c.use_count, c.created_at::text,
           l.sso_user_id AS creator_sso_id
    FROM sso_invite_codes c
    LEFT JOIN sso_invite_codes_creator_lnk l ON l.sso_invite_code_id=c.id
    WHERE c.code='KUQFDTLJ' OR l.sso_user_id=12;"
echo '=== 全库邀请码总数 ==='
DB "SELECT count(*) FROM sso_invite_codes;"
echo 'DONE'