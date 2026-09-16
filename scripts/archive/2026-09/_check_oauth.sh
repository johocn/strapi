#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
echo '=== 现库 sso_oauth_configs ==='
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT id, provider, app_type, COALESCE(app_id,'') app_id, is_enabled, COALESCE(scope,'') scope FROM sso_oauth_configs ORDER BY id;" 2>/dev/null
echo ''
echo '=== 现库所有 sso_oauth* 表 ==='
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%oauth%' OR table_name LIKE '%sso_config%' ORDER BY table_name;" 2>/dev/null
echo ''
echo '=== 8-30 备份中是否有 sso_oauth_configs ==='
zcat /home/admin/strapi_pre_cleanup_20260830.jsonl.gz | grep -c '^#T\t' | head
zcat /home/admin/strapi_pre_cleanup_20260830.jsonl.gz | grep -n 'sso_oauth_configs' | head -5
echo 'DONE'