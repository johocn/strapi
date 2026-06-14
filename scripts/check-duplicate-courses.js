/**
 * 检查重复课程的原因
 */
const { Client } = require('pg');

async function checkDuplicateCourses() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    // 查询所有标题为"指定渠道不跨渠道"的课程
    const courses = await client.query(`
      SELECT id, document_id, title, status, published_at, created_at, updated_at
      FROM zhao_courses
      WHERE title = '指定渠道不跨渠道'
      ORDER BY created_at ASC
    `);

    console.log('=== 标题为"指定渠道不跨渠道"的课程 ===');
    console.log(`共找到 ${courses.rows.length} 条记录`);
    courses.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. ID: ${row.id}`);
      console.log(`   Document ID: ${row.document_id}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Published At: ${row.published_at}`);
      console.log(`   Created At: ${row.created_at}`);
      console.log(`   Updated At: ${row.updated_at}`);
    });

    // 检查是否有相同 document_id 的记录
    const duplicateDocIds = await client.query(`
      SELECT document_id, COUNT(*) as count
      FROM zhao_courses
      GROUP BY document_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

    console.log('\n=== 重复的 Document ID ===');
    if (duplicateDocIds.rows.length === 0) {
      console.log('无重复');
    } else {
      duplicateDocIds.rows.forEach(row => {
        console.log(`Document ID: ${row.document_id}, 重复次数: ${row.count}`);
      });
    }

    // 检查 Strapi 的 D&P 机制（查看是否有 draft/published 状态）
    console.log('\n=== 检查 Strapi D&P 状态 ===');
    const versions = await client.query(`
      SELECT id, title, status, published_at, 
             (SELECT COUNT(*) FROM zhao_courses c2 WHERE c2.document_id = c.document_id) as version_count
      FROM zhao_courses c
      WHERE document_id IN (SELECT document_id FROM zhao_courses GROUP BY document_id HAVING COUNT(*) > 1)
      ORDER BY document_id, created_at
    `);

    versions.rows.forEach(row => {
      console.log(`Document ID: ${row.document_id}, Title: ${row.title}, Status: ${row.status}, Versions: ${row.version_count}`);
    });

    // 查询具体的重复课程详情
    console.log('\n=== 检查相同 document_id 的课程详情 ===');
    const sameDocId = await client.query(`
      SELECT id, title, status, published_at, created_at
      FROM zhao_courses
      WHERE document_id = 'laudaldvq00tsrx3turx9f1d'
    `);
    sameDocId.rows.forEach(row => {
      console.log(`ID: ${row.id}, Status: ${row.status}, Published At: ${row.published_at}, Created: ${row.created_at}`);
    });

  } catch (err) {
    console.error('查询失败:', err);
  } finally {
    await client.end();
  }
}

checkDuplicateCourses();
