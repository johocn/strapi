/**
 * 清理重复的课程数据
 */
const { Client } = require('pg');

async function removeDuplicateCourses() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    // 查询所有重复的 document_id
    const duplicates = await client.query(`
      SELECT document_id, COUNT(*) as count
      FROM zhao_courses
      GROUP BY document_id
      HAVING COUNT(*) > 1
    `);

    console.log(`找到 ${duplicates.rows.length} 个重复的 document_id`);

    // 处理每个重复的 document_id
    for (const row of duplicates.rows) {
      const docId = row.document_id;
      
      // 获取该 document_id 的所有记录
      const records = await client.query(`
        SELECT id, status, published_at, created_at
        FROM zhao_courses
        WHERE document_id = $1
        ORDER BY id ASC
      `, [docId]);

      console.log(`\n处理 document_id: ${docId}`);
      console.log(`共有 ${records.rows.length} 条记录:`);
      
      // 保留第一条记录，删除其余的
      if (records.rows.length > 1) {
        const keepId = records.rows[0].id;
        const deleteIds = records.rows.slice(1).map(r => r.id);
        
        console.log(`保留 ID: ${keepId}`);
        console.log(`删除 IDs: ${deleteIds.join(', ')}`);

        // 删除重复记录
        const deleteResult = await client.query(`
          DELETE FROM zhao_courses
          WHERE id = ANY($1)
          RETURNING id, title
        `, [deleteIds]);

        console.log(`已删除 ${deleteResult.rowCount} 条重复记录`);
      }
    }

    console.log('\n=== 清理完成 ===');

  } catch (err) {
    console.error('清理失败:', err);
  } finally {
    await client.end();
  }
}

removeDuplicateCourses();
