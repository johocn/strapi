/**
 * 检查渠道成员表结构
 */
const { Client } = require('pg');

async function checkChannelMemberStructure() {
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

    // 1. zhao_channel_members_channel_lnk 表结构
    console.log('=== zhao_channel_members_channel_lnk 表结构 ===');
    const cmclStruct = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'zhao_channel_members_channel_lnk'
      ORDER BY ordinal_position
    `);
    cmclStruct.rows.forEach(r => console.log(`  ${r.column_name}`));

    // 2. zhao_channel_members_channel_lnk 数据
    console.log('\n=== zhao_channel_members_channel_lnk 数据样例 ===');
    const cmclData = await client.query(`SELECT * FROM zhao_channel_members_channel_lnk LIMIT 5`);
    console.log(JSON.stringify(cmclData.rows, null, 2));

    // 3. 用户 shao 的渠道成员关联
    console.log('\n=== 用户 shao 渠道成员关联 ===');
    const cmulData = await client.query(`
      SELECT cmul.channel_member_id, cmul.user_id
      FROM zhao_channel_members_user_lnk cmul
      WHERE cmul.user_id = $1
    `, [userId]);
    console.log(JSON.stringify(cmulData.rows, null, 2));

    // 4. 根据用户渠道成员关联查询渠道
    if (cmulData.rows.length > 0) {
      const memberIds = cmulData.rows.map(r => r.channel_member_id);
      console.log('\n=== 渠道成员对应的渠道 ===');
      const channels = await client.query(`
        SELECT cmcl.channel_member_id, cmcl.channel_id, c.id, c.name
        FROM zhao_channel_members_channel_lnk cmcl
        JOIN zhao_channels c ON cmcl.channel_id = c.id
        WHERE cmcl.channel_member_id = ANY($1)
      `, [memberIds]);
      console.log(JSON.stringify(channels.rows, null, 2));
    }

  } catch (err) {
    console.error('检查失败:', err);
  } finally {
    await client.end();
  }
}

checkChannelMemberStructure();