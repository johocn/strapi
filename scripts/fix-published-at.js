/**
 * 修复 published_at 为 null 的课程
 */
const { Client } = require('pg');

async function fixPublishedAt() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    // 查询所有 published_at 为 null 但 status='published' 的课程
    const courses = await client.query(`
      SELECT id, document_id, title, status, published_at
      FROM zhao_courses
      WHERE status = 'published' AND published_at IS NULL
    `);

    console.log(`找到 ${courses.rows.length} 条需要修复的课程:`);
    courses.rows.forEach(r => {
      console.log(`  ID: ${r.id}, Title: ${r.title}`);
    });

    // 批量修复：设置 published_at 为 updated_at 或当前时间
    if (courses.rows.length > 0) {
      const ids = courses.rows.map(r => r.id);
      const fixResult = await client.query(`
        UPDATE zhao_courses
        SET published_at = COALESCE(updated_at, NOW())
        WHERE id = ANY($1)
        RETURNING id, title, published_at
      `, [ids]);

      console.log(`\n已修复 ${fixResult.rowCount} 条课程:`);
      fixResult.rows.forEach(r => {
        console.log(`  ID: ${r.id}, Title: ${r.title}, published_at: ${r.published_at}`);
      });
    }

  } catch (err) {
    console.error('修复失败:', err);
  } finally {
    await client.end();
  }
}

fixPublishedAt();
