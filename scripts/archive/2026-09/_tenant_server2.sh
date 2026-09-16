#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
\echo '=== zhao_site_configs 全部数据 ==='
SELECT id, document_id, site_name, domain, channel_usage, COALESCE(extra_config::text,'') extra_config, created_at, updated_at, deleted_at
FROM zhao_site_configs ORDER BY id;

\echo '=== zhao_site_templates ==='
SELECT id, document_id, name, created_at FROM zhao_site_templates ORDER BY id;

\echo '=== zhao_channels_sites_lnk（渠道-站点关联）==='
SELECT * FROM zhao_channels_sites_lnk ORDER BY 1,2;

\echo '=== 是否有 deleted_at 非空的软删除记录？ ==='
SELECT id, site_name, deleted_at FROM zhao_site_configs WHERE deleted_at IS NOT NULL ORDER BY id;

\echo '=== 所有 zhao_* 插件 content-type 有没有带 "site" 或 "tenant" 的 collection ==='
SELECT DISTINCT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name ILIKE '%tenant%'
ORDER BY table_name;

\echo '=== 检查 up_users 的 site 关联 ==='
SELECT column_name FROM information_schema.columns WHERE table_name='up_users' AND (column_name ILIKE '%site%' OR column_name ILIKE '%tenant%')
ORDER BY column_name;
SQL
echo "DONE"