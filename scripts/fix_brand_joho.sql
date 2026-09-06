-- 品牌名替换：圣麟教育 → joho.cn（全库精确替换，不碰"圣麟口腔"等独立品牌）
-- 命中（2026-09-06 扫描）：zhao_site_configs id=1 三列 + zhao_studio_ad_contents id=2 html 尾部
-- 用法：Get-Content fix_brand_joho.sql | ssh joho "docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A"

BEGIN;

UPDATE zhao_site_configs
   SET site_name = REPLACE(site_name, '圣麟教育', 'joho.cn'),
       share_title = REPLACE(share_title, '圣麟教育', 'joho.cn'),
       seo_description = REPLACE(seo_description, '圣麟教育', 'joho.cn')
 WHERE site_name LIKE '%圣麟教育%'
    OR share_title LIKE '%圣麟教育%'
    OR seo_description LIKE '%圣麟教育%';

UPDATE zhao_studio_ad_contents
   SET html_content = REPLACE(html_content, '圣麟教育', 'joho.cn')
 WHERE html_content LIKE '%圣麟教育%';

-- 核对：以下查询应均返回 0 行
SELECT 'site_configs' AS src, id, site_name, share_title, seo_description
  FROM zhao_site_configs WHERE site_name LIKE '%圣麟教育%' OR share_title LIKE '%圣麟教育%' OR seo_description LIKE '%圣麟教育%';
SELECT 'ad_contents' AS src, id, position('圣麟教育' in html_content) AS pos
  FROM zhao_studio_ad_contents WHERE html_content LIKE '%圣麟教育%';

COMMIT;
