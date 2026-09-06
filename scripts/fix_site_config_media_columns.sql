-- 修复 site-info 500：zhao_site_configs 补 media 列（Strapi v5 media 为 jsonb）
-- 背景：zhao-common site-config schema 声明 logo/favicon/share_image/poster_default_user_avatar，
--       生产表未同步这些列，导致 /api/zhao-website/v1/site-info 500（column "logo" does not exist）
-- 用法：Get-Content fix_site_config_media_columns.sql | ssh joho "docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A"

BEGIN;

ALTER TABLE zhao_site_configs
  ADD COLUMN IF NOT EXISTS logo jsonb,
  ADD COLUMN IF NOT EXISTS favicon jsonb,
  ADD COLUMN IF NOT EXISTS share_image jsonb,
  ADD COLUMN IF NOT EXISTS poster_default_user_avatar jsonb;

-- 核对：4 列应全部存在
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'zhao_site_configs'
   AND column_name IN ('logo','favicon','share_image','poster_default_user_avatar')
 ORDER BY column_name;

COMMIT;
