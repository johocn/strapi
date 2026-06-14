/**
 * 检查课程是否存在
 */
const { Client } = require('pg');

async function checkCourseExists(documentId) {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    console.log(`=== 检查课程 documentId: ${documentId} ===\n`);

    // 检查是否存在
    const result = await client.query(`
      SELECT id, document_id, title, status, published_at
      FROM zhao_courses
      WHERE document_id = $1
    `, [documentId]);

    if (result.rows.length === 0) {
      console.log(`❌ 课程不存在: ${documentId}`);
      
      // 列出所有可用的课程
      console.log('\n=== 可用课程列表 ===');
      const allCourses = await client.query(`
        SELECT id, document_id, title, status
        FROM zhao_courses
        ORDER BY title
      `);
      allCourses.rows.forEach(c => {
        console.log(`  - ${c.title} (documentId: ${c.document_id}, status: ${c.status})`);
      });
    } else {
      const course = result.rows[0];
      console.log(`✓ 课程存在:`);
      console.log(`  ID: ${course.id}`);
      console.log(`  documentId: ${course.document_id}`);
      console.log(`  title: ${course.title}`);
      console.log(`  status: ${course.status}`);
      console.log(`  published_at: ${course.published_at}`);
    }

  } catch (err) {
    console.error('检查失败:', err);
  } finally {
    await client.end();
  }
}

const documentId = process.argv[2] || 'dm5d79wqtohvbz3rs6lk37ea';
checkCourseExists(documentId);