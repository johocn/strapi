/**
 * 查询用户所属渠道
 */
const { Client } = require('pg');

async function checkUserChannels() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    // 查询用户名为 'shao' 的用户
    const userResult = await client.query(`
      SELECT id, username, email
      FROM up_users
      WHERE username = 'shao'
      LIMIT 1
    `);

    if (userResult.rows.length === 0) {
      console.log('未找到用户: shao');
      return;
    }

    const user = userResult.rows[0];
    const userId = user.id;
    console.log('=== 用户信息 ===');
    console.log(`用户ID: ${userId}`);
    console.log(`用户名: ${user.username}`);

    // 方式1: zhao_user_channels (用户渠道授权表)
    console.log('\n=== 方式1: zhao_user_channels ===');
    const ucResult = await client.query(`
      SELECT DISTINCT c.id, c.name, c.code
      FROM zhao_user_channels_user_lnk ucl
      JOIN zhao_user_channels_channel_lnk ccl ON ucl.user_channel_id = ccl.user_channel_id
      JOIN zhao_channels c ON ccl.channel_id = c.id
      WHERE ucl.user_id = $1
    `, [userId]);

    if (ucResult.rows.length === 0) {
      console.log('无关联');
    } else {
      ucResult.rows.forEach((row, i) => {
        console.log(`${i + 1}. ID: ${row.id}, 名称: ${row.name}, 代码: ${row.code}`);
      });
    }

    // 方式2: zhao_role_channels (用户渠道角色表)
    console.log('\n=== 方式2: zhao_role_channels ===');
    const rcResult = await client.query(`
      SELECT DISTINCT c.id, c.name, c.code, rc.role
      FROM zhao_role_channels_granted_by_lnk rcgl
      JOIN zhao_role_channels_channel_lnk rccl ON rcgl.role_channel_id = rccl.role_channel_id
      JOIN zhao_channels c ON rccl.channel_id = c.id
      JOIN zhao_role_channels rc ON rcgl.role_channel_id = rc.id
      WHERE rcgl.user_id = $1
    `, [userId]);

    if (rcResult.rows.length === 0) {
      console.log('无关联');
    } else {
      rcResult.rows.forEach((row, i) => {
        console.log(`${i + 1}. ID: ${row.id}, 名称: ${row.name}, 代码: ${row.code}, 角色: ${row.role}`);
      });
    }

    // 方式3: zhao_channel_members (渠道成员表)
    console.log('\n=== 方式3: zhao_channel_members ===');
    const cmResult = await client.query(`
      SELECT DISTINCT c.id, c.name, c.code, cm.id as member_id
      FROM zhao_channel_members_user_lnk cmul
      JOIN zhao_channel_members_channel_lnk cmcl ON cmul.channel_member_id = cmcl.channel_member_id
      JOIN zhao_channels c ON cmcl.channel_id = c.id
      JOIN zhao_channel_members cm ON cmul.channel_member_id = cm.id
      WHERE cmul.user_id = $1
    `, [userId]);

    if (cmResult.rows.length === 0) {
      console.log('无关联');
    } else {
      cmResult.rows.forEach((row, i) => {
        console.log(`${i + 1}. ID: ${row.id}, 名称: ${row.name}, 代码: ${row.code}, 成员ID: ${row.member_id}`);
      });
    }

    // 汇总所有渠道ID
    const allChannelIds = new Set([
      ...ucResult.rows.map(r => r.id),
      ...rcResult.rows.map(r => r.id),
      ...cmResult.rows.map(r => r.id)
    ]);

    console.log('\n=== 用户 shao 所属的所有渠道ID ===');
    console.log([...allChannelIds].join(', '));

  } catch (err) {
    console.error('查询失败:', err);
  } finally {
    await client.end();
  }
}

checkUserChannels();
