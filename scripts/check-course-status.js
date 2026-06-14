/**
 * 检查课程状态
 */
const { Client } = require('pg');

async function checkCourseStatus() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    console.log('=== 课程状态检查 ===\n');

    const courses = await client.query(`
      SELECT id, document_id, title, status, channel_scope, allow_cross_channel, channel_ids, published_at
      FROM zhao_courses
      ORDER BY status, title
    `);

    console.log(`共 ${courses.rows.length} 条课程记录:`);
    courses.rows.forEach(c => {
      console.log(`\nID: ${c.id}`);
      console.log(`  title: ${c.title}`);
      console.log(`  status: ${c.status}`);
      console.log(`  channel_scope: ${c.channel_scope}`);
      console.log(`  allow_cross_channel: ${c.allow_cross_channel}`);
      console.log(`  channel_ids: ${JSON.stringify(c.channel_ids)}`);
      console.log(`  published_at: ${c.published_at}`);
    });

  } catch (err) {
    console.error('检查失败:', err);
  } finally {
    await client.end();
  }
}

checkCourseStatus();