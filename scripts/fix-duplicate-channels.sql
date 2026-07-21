-- ============================================
-- 修复脚本：清理孤儿渠道（注册失败遗留的渠道）
-- 执行前请备份数据库
-- ============================================

-- 步骤 1：预览孤儿渠道（先运行此 SELECT 确认）
-- 孤儿定义：非 root、depth>0、无 channel-member 关联的渠道
SELECT c.id, c.name, c.code, c.path, c.channel_tier, c.depth, c.created_at
FROM zhao_channels c
LEFT JOIN zhao_channel_members cm ON cm.channel_id = c.id
WHERE cm.id IS NULL
  AND c.channel_tier != 'root'
  AND c.depth > 0
ORDER BY c.created_at DESC;

-- 步骤 2：删除孤儿渠道的 user_channels 关联
DELETE FROM zhao_user_channels
WHERE channel_id IN (
  SELECT c.id FROM zhao_channels c
  LEFT JOIN zhao_channel_members cm ON cm.channel_id = c.id
  WHERE cm.id IS NULL AND c.channel_tier != 'root' AND c.depth > 0
);

-- 步骤 3：删除孤儿渠道的 role_channels 关联
DELETE FROM zhao_role_channels
WHERE channel_id IN (
  SELECT c.id FROM zhao_channels c
  LEFT JOIN zhao_channel_members cm ON cm.channel_id = c.id
  WHERE cm.id IS NULL AND c.channel_tier != 'root' AND c.depth > 0
);

-- 步骤 4：删除孤儿渠道本身
DELETE FROM zhao_channels
WHERE id IN (
  SELECT c.id FROM zhao_channels c
  LEFT JOIN zhao_channel_members cm ON cm.channel_id = c.id
  WHERE cm.id IS NULL AND c.channel_tier != 'root' AND c.depth > 0
);

-- 步骤 5：验证清理结果（应返回 0 行）
SELECT COUNT(*) AS remaining_orphans
FROM zhao_channels c
LEFT JOIN zhao_channel_members cm ON cm.channel_id = c.id
WHERE cm.id IS NULL
  AND c.channel_tier != 'root'
  AND c.depth > 0;
