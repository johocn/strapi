/**
 * 修复用户 channel_member.isCurrent
 */
const { Client } = require('pg');

async function fixIsCurrent() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    console.log('=== 修复 channel_member.isCurrent ===\n');

    // 1. 查看当前状态
    const before = await client.query(`
      SELECT cm.id, cm.is_current, cm.role, c.name as channel_name
      FROM zhao_channel_members cm
      JOIN zhao_channel_members_user_lnk cmul ON cm.id = cmul.channel_member_id
      JOIN zhao_channel_members_channel_lnk cmcl ON cm.id = cmcl.channel_member_id
      JOIN zhao_channels c ON cmcl.channel_id = c.id
      WHERE cmul.user_id = 2
    `);
    console.log('修复前:');
    before.rows.forEach(r => console.log(`  member_id: ${r.id}, isCurrent: ${r.is_current}, role: ${r.role}, channel: ${r.channel_name}`));

    // 2. 设置 isCurrent = true
    const update = await client.query(`
      UPDATE zhao_channel_members
      SET is_current = true
      WHERE id = 13
      RETURNING id, is_current
    `);
    console.log('\n修复后:');
    console.log(`  member_id: ${update.rows[0].id}, isCurrent: ${update.rows[0].is_current}`);

    // 3. 清除用户渠道缓存（如果有）
    console.log('\n提示: 需要清除 Redis 缓存或重启服务使更改生效');

  } catch (err) {
    console.error('修复失败:', err);
  } finally {
    await client.end();
  }
}

fixIsCurrent();