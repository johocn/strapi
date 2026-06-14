/**
 * 检查课程数据
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

    // 查询课程
    const courseResult = await client.query(`
      SELECT id, document_id, title, status, audit_status, channel_scope, allow_cross_channel
      FROM zhao_courses
      WHERE document_id = 'laudaldvq00tsrx3turx9f1d'
    `);

    console.log('=== 课程基本信息 ===');
    if (courseResult.rows.length === 0) {
      console.log('未找到课程');
      return;
    }
    console.log(JSON.stringify(courseResult.rows[0], null, 2));

    // 查询课程的渠道关联
    const channelResult = await client.query(`
      SELECT c.id, c.name, c.code
      FROM zhao_courses_channel_ids_channel_lnk ccl
      JOIN zhao_channels c ON ccl.channel_id = c.id
      WHERE ccl.zhao_course_id = $1
    `, [courseResult.rows[0].id]);

    console.log('\n=== 课程关联的渠道 ===');
    channelResult.rows.forEach(row => {
      console.log(`ID: ${row.id}, 名称: ${row.name}, 代码: ${row.code}`);
    });

    // 查询所有已发布的课程
    const publishedCourses = await client.query(`
      SELECT id, document_id, title, status, audit_status, channel_scope
      FROM zhao_courses
      WHERE status = 'published'
      ORDER BY id DESC
      LIMIT 20
    `);

    console.log('\n=== 最近20条已发布课程 ===');
    publishedCourses.rows.forEach(row => {
      console.log(`ID: ${row.id}, Title: ${row.title}, Status: ${row.status}, Audit: ${row.audit_status}, Scope: ${row.channel_scope}`);
    });

    // 查询用户 shao 的渠道
    const userChannels = await client.query(`
      SELECT c.id, c.name
      FROM zhao_channel_members_user_lnk cmul
      JOIN zhao_channel_members_channel_lnk cmcl ON cmul.channel_member_id = cmcl.channel_member_id
      JOIN zhao_channels c ON cmcl.channel_id = c.id
      JOIN zhao_channel_members cm ON cmul.channel_member_id = cm.id
      WHERE cmul.user_id = 2
    `);

    console.log('\n=== 用户 shao (ID:2) 的渠道 ===');
    userChannels.rows.forEach(row => {
      console.log(`渠道ID: ${row.id}, 名称: ${row.name}`);
    });

  } catch (err) {
    console.error('查询失败:', err);
  } finally {
    await client.end();
  }
}

checkCourse();
