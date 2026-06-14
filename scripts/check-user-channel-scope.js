/**
 * 检查用户渠道权限解析
 */
const { Client } = require('pg');

async function checkUserChannelScope() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    console.log('=== 用户 shao 渠道权限检查 ===\n');

    // 1. 用户基本信息
    const user = await client.query(`
      SELECT id, username, email
      FROM up_users
      WHERE username = 'shao'
    `);
    const userId = user.rows[0]?.id;
    console.log(`用户 ID: ${userId}`);

    // 2. 查找用户角色表
    const roleTables = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE '%role%'
      ORDER BY tablename
    `);
    console.log('\n角色相关表:');
    roleTables.rows.forEach(r => console.log(`  - ${r.tablename}`));

    // 3. 查找用户渠道关联表
    const channelTables = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE '%channel%'
      ORDER BY tablename
    `);
    console.log('\n渠道相关表:');
    channelTables.rows.forEach(r => console.log(`  - ${r.tablename}`));

    // 4. 检查 zhao_user_roles 表结构
    const userRolesStruct = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'zhao_user_roles'
      ORDER BY ordinal_position
    `);
    console.log('\nzhao_user_roles 表字段:');
    userRolesStruct.rows.forEach(r => console.log(`  - ${r.column_name}`));

    // 5. 查询用户角色
    const userRoles = await client.query(`
      SELECT ur.id, ur.role, ur.user_id
      FROM zhao_user_roles ur
      WHERE ur.user_id = $1
    `, [userId]);
    console.log('\n用户角色记录:');
    if (userRoles.rows.length === 0) {
      console.log('  无角色记录');
    } else {
      userRoles.rows.forEach(r => console.log(`  - ID: ${r.id}, role: ${r.role}`));
    }

    // 6. 用户渠道关联（zhao_channel_members）
    const channelMembers = await client.query(`
      SELECT c.id, c.name, c.code
      FROM zhao_channel_members_user_lnk cmul
      JOIN zhao_channel_members cm ON cmul.channel_member_id = cm.id
      JOIN zhao_channel_members_channel_lnk cmcl ON cm.id = cmcl.channel_member_id
      JOIN zhao_channels c ON cmcl.channel_id = c.id
      WHERE cmul.user_id = $1
    `, [userId]);
    console.log('\n用户渠道（channel_members）:');
    channelMembers.rows.forEach(c => console.log(`  - ID: ${c.id}, 名称: ${c.name}`));

    // 7. 课程信息
    console.log('\n=== 课程"指定渠道不跨渠道"信息 ===');
    const course = await client.query(`
      SELECT id, document_id, title, channel_scope, allow_cross_channel, channel_ids
      FROM zhao_courses
      WHERE document_id = 'laudaldvq00tsrx3turx9f1d'
    `);
    const c = course.rows[0];
    console.log(`课程 ID: ${c.id}`);
    console.log(`channel_scope: ${c.channel_scope}`);
    console.log(`allow_cross_channel: ${c.allow_cross_channel}`);
    console.log(`channel_ids: ${JSON.stringify(c.channel_ids)}`);

    // 8. 检查匹配
    console.log('\n=== 匹配检查 ===');
    const userChannelIds = channelMembers.rows.map(r => r.id);
    const courseChannelIds = c.channel_ids;
    
    console.log(`用户渠道 IDs: [${userChannelIds.join(', ')}]`);
    console.log(`课程渠道 IDs: [${courseChannelIds.join(', ')}]`);
    
    const hasMatch = userChannelIds.some(uid => courseChannelIds.some(cid => String(uid) === String(cid)));
    console.log(`匹配结果: ${hasMatch ? '✓ 有匹配' : '✗ 无匹配'}`);

  } catch (err) {
    console.error('检查失败:', err);
  } finally {
    await client.end();
  }
}

checkUserChannelScope();