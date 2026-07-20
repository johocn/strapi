-- 补救脚本：将修复前注册的低 tier 渠道所有者的 channel-member.role 从 'member' 更新为 'admin'
-- 修复 bug：channel.ts#L573 查找父渠道 admin 用户时，national owner 被标为 'member' 导致查不到
-- 条件：
--   role='member'（错误标记）
--   is_current=true（注册时创建的记录，邀请加入的成员 is_current=false）
--   channel_tier IN 低 tier（高 tier 修复前已是 admin，无需更新）

-- 1. 执行前查询：受影响的记录数
SELECT count(*) AS affected_count
FROM zhao_channel_members cm
JOIN zhao_channels c ON cm.channel_id = c.id
WHERE cm.role = 'member'
  AND cm.is_current = true
  AND c.channel_tier IN ('national', 'regional', 'city', 'county', 'local', 'store');

-- 2. 执行补救更新
UPDATE zhao_channel_members cm
SET role = 'admin', updated_at = NOW()
FROM zhao_channels c
WHERE cm.channel_id = c.id
  AND cm.role = 'member'
  AND cm.is_current = true
  AND c.channel_tier IN ('national', 'regional', 'city', 'county', 'local', 'store');

-- 3. 执行后验证：所有低 tier 渠道所有者都应是 admin
SELECT c.channel_tier, cm.role, count(*)
FROM zhao_channel_members cm
JOIN zhao_channels c ON cm.channel_id = c.id
WHERE cm.is_current = true
  AND c.channel_tier IN ('national', 'regional', 'city', 'county', 'local', 'store')
GROUP BY c.channel_tier, cm.role
ORDER BY c.channel_tier;
-- 预期：所有低 tier 的 is_current=true 记录 role 都是 'admin'
