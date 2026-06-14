/**
 * 检查表结构
 */
const { Client } = require('pg');

async function checkTableStructure() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    const userId = 2;

    // 1. zhao_user_channels 表结构
    console.log('=== zhao_user_channels 表结构 ===');
    const ucStruct = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'zhao_user_channels'
      ORDER BY ordinal_position
    `);
    ucStruct.rows.forEach(r => console.log(`  ${r.column_name}`));

    // 2. zhao_user_channels 数据
    console.log('\n=== zhao_user_channels 数据 ===');
    const ucData = await client.query(`SELECT * FROM zhao_user_channels LIMIT 5`);
    console.log(JSON.stringify(ucData.rows, null, 2));

    // 3. zhao_user_channels_user_lnk 表结构
    console.log('\n=== zhao_user_channels_user_lnk 表结构 ===');
    const uculStruct = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'zhao_user_channels_user_lnk'
      ORDER BY ordinal_position
    `);
    uculStruct.rows.forEach(r => console.log(`  ${r.column_name}`));

    // 4. zhao_user_channels_user_lnk 数据（用户ID=2）
    console.log('\n=== zhao_user_channels_user_lnk 数据（用户ID=2） ===');
    const uculData = await client.query(`
      SELECT * FROM zhao_user_channels_user_lnk WHERE up_user_id = $1
    `, [userId]);
    console.log(JSON.stringify(uculData.rows, null, 2));

    // 5. zhao_channel_members 表结构
    console.log('\n=== zhao_channel_members 表结构 ===');
    const cmStruct = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'zhao_channel_members'
      ORDER BY ordinal_position
    `);
    cmStruct.rows.forEach(r => console.log(`  ${r.column_name}`));

    // 6. zhao_channel_members 数据（用户ID=2）
    console.log('\n=== zhao_channel_members 数据（用户ID=2） ===');
    const cmData = await client.query(`
      SELECT cm.id, cm.is_current
      FROM zhao_channel_members cm
      JOIN zhao_channel_members_user_lnk cmul ON cm.id = cmul.channel_member_id
      WHERE cmul.up_user_id = $1
    `, [userId]);
    console.log(JSON.stringify(cmData.rows, null, 2));

    // 7. 用户 zhaoRoles
    console.log('\n=== 用户 zhaoRoles ===');
    const userRoles = await client.query(`
      SELECT id, zhao_roles FROM up_users WHERE id = $1
    `, [userId]);
    console.log(JSON.stringify(userRoles.rows, null, 2));

  } catch (err) {
    console.error('检查失败:', err);
  } finally {
    await client.end();
  }
}

checkTableStructure();