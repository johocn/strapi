#!/bin/bash
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off <<'SQL'
INSERT INTO zhao_point_rules
  (document_id, action, category, points, description, enabled, limit_per_day, limit_per_user, limit_per_day_per_user, is_one_time, priority, task_group, extra_config, name, link_type, created_at, updated_at)
SELECT substr(md5('share_article'||clock_timestamp()::text),1,32), 'share_article', 'increase', 3, '文章分享', true, 5, 0, 0, false, 0, 'interact', '{"intervalMinutes":30}'::jsonb, '文章分享', 'none', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM zhao_point_rules WHERE action='share_article');

INSERT INTO zhao_point_rules
  (document_id, action, category, points, description, enabled, limit_per_day, limit_per_user, limit_per_day_per_user, is_one_time, priority, task_group, extra_config, name, link_type, created_at, updated_at)
SELECT substr(md5('share_video'||clock_timestamp()::text),1,32), 'share_video', 'increase', 3, '视频分享', true, 5, 0, 0, false, 0, 'interact', '{"intervalMinutes":30}'::jsonb, '视频分享', 'none', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM zhao_point_rules WHERE action='share_video');

-- 若已存在则仅补齐 extra_config（幂等），确保 intervalMinutes=30
UPDATE zhao_point_rules SET extra_config='{"intervalMinutes":30}'::jsonb, updated_at=now() WHERE action IN ('share_article','share_video') AND (extra_config IS NULL OR extra_config ?| array['intervalMinutes'] IS NOT TRUE);
SQL
echo "---after---"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "SELECT id, action, category, points, enabled, is_one_time, task_group, name, link_type FROM zhao_point_rules ORDER BY id;"
echo DONE