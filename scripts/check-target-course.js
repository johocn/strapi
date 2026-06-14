/**
 * 详细检查课程状态
 */
const { Client } = require('pg');

async function checkCourse() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    // 查询目标课程
    const course = await client.query(`
      SELECT id, document_id, title, status, published_at, channel_scope, allow_cross_channel, channel_ids
      FROM zhao_courses
      WHERE document_id = 'laudaldvq00tsrx3turx9f1d'
    `);

    console.log('=== 目标课程详情 ===');
    if (course.rows.length === 0) {
      console.log('未找到该课程');
    } else {
      const c = course.rows[0];
      console.log(`ID: ${c.id}`);
      console.log(`Document ID: ${c.document_id}`);
      console.log(`Title: ${c.title}`);
      console.log(`Status: ${c.status}`);
      console.log(`Published At: ${c.published_at}`);
      console.log(`Channel Scope: ${c.channel_scope}`);
      console.log(`Allow Cross Channel: ${c.allow_cross_channel}`);
      console.log(`Channel IDs: ${JSON.stringify(c.channel_ids)}`);
    }

    // 查询用户 shao 的渠道
    console.log('\n=== 用户 shao 渠道 ===');
    const userChannel = await client.query(`
      SELECT c.id, c.name
      FROM zhao_channel_members_user_lnk cmul
      JOIN zhao_channel_members cm ON cmul.channel_member_id = cm.id
      JOIN zhao_channel_members_channel_lnk cmcl ON cm.id = cmcl.channel_member_id
      JOIN zhao_channels c ON cmcl.channel_id = c.id
      WHERE cmul.user_id = 2
    `);
    userChannel.rows.forEach(r => console.log(`渠道ID: ${r.id}, 名称: ${r.name}`));

  } catch (err) {
    console.error('查询失败:', err);
  } finally {
    await client.end();
  }
}

checkCourse();
