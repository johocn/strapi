-- riskType 迁移：isFinance=true → finance-general；false → none
-- 前提：dist 已部署、Strapi 已重启（risk_type 列由 Strapi bootstrap 自动创建）
-- 用法：psql -U <user> -d <db> -f migrate_geo_risk_type.sql

BEGIN;

UPDATE zhao_website_geo_articles
   SET risk_type = CASE WHEN is_finance THEN 'finance-general' ELSE 'none' END
 WHERE risk_type IS NULL OR risk_type = '';

-- 数据核对（预期：0 行）
SELECT count(*) AS remaining_null FROM zhao_website_geo_articles
 WHERE risk_type IS NULL OR risk_type = '';

-- 确认无误后放开注释执行删列（Strapi 不会自动删旧列）
-- ALTER TABLE zhao_website_geo_articles DROP COLUMN IF EXISTS is_finance;

COMMIT;
