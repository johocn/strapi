/**
 * 检查当前数据状态
 */
const { Client } = require('pg');

async function checkDataStatus() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    console.log('=== 当前数据状态检查 ===\n');

    // 1. 检查是否还有重复数据
    console.log('1. 检查重复数据：');
    const duplicates = await client.query(`
      SELECT document_id, COUNT(*) as count
      FROM zhao_courses
      GROUP BY document_id
      HAVING COUNT(*) > 1
    `);
    if (duplicates.rows.length === 0) {
      console.log('   ✓ 无重复数据');
    } else {
      console.log(`   ✗ 发现 ${duplicates.rows.length} 个重复的 document_id`);
    }

    // 2. 检查课程总数
    console.log('\n2. 课程总数：');
    const total = await client.query('SELECT COUNT(*) FROM zhao_courses');
    console.log(`   ${total.rows[0].count} 条课程记录`);

    // 3. 检查各状态分布
    console.log('\n3. 课程状态分布：');
    const statusDist = await client.query(`
      SELECT status, COUNT(*) as count
      FROM zhao_courses
      GROUP BY status
    `);
    statusDist.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} 条`);
    });

    // 4. 检查 published_at 为 null 的课程
    console.log('\n4. published_at 为空的课程：');
    const nullPublish = await client.query(`
      SELECT COUNT(*) FROM zhao_courses 
      WHERE status = 'published' AND published_at IS NULL
    `);
    if (nullPublish.rows[0].count === '0') {
      console.log('   ✓ 无 published_at 为空的已发布课程');
    } else {
      console.log(`   ✗ ${nullPublish.rows[0].count} 条已发布课程的 published_at 为空`);
    }

    // 5. 检查指定课程
    console.log('\n5. 指定课程详情：');
    const targetCourse = await client.query(`
      SELECT id, document_id, title, status, channel_scope, allow_cross_channel, channel_ids
      FROM zhao_courses
      WHERE document_id = 'laudaldvq00tsrx3turx9f1d'
    `);
    if (targetCourse.rows.length === 1) {
      const c = targetCourse.rows[0];
      console.log(`   ✓ document_id: ${c.document_id}`);
      console.log(`     title: ${c.title}`);
      console.log(`     status: ${c.status}`);
      console.log(`     channel_scope: ${c.channel_scope}`);
      console.log(`     allow_cross_channel: ${c.allow_cross_channel}`);
      console.log(`     channel_ids: ${JSON.stringify(c.channel_ids)}`);
    } else {
      console.log(`   ✗ 找到 ${targetCourse.rows.length} 条记录（期望1条）`);
    }

    console.log('\n=== 检查完成 ===');

  } catch (err) {
    console.error('检查失败:', err);
  } finally {
    await client.end();
  }
}

checkDataStatus();
