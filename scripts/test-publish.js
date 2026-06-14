/**
 * 测试 publish 方法
 */
const { Client } = require('pg');

async function testPublish() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    // 检查 ID 28 的课程在 API 调用前后的 published_at
    const before = await client.query(`
      SELECT id, title, status, published_at, created_at, updated_at
      FROM zhao_courses
      WHERE id = 28
    `);
    console.log('ID 28 当前状态:');
    console.log(JSON.stringify(before.rows[0], null, 2));

  } catch (err) {
    console.error('查询失败:', err);
  } finally {
    await client.end();
  }
}

testPublish();
