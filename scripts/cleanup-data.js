// 清理课程相关数据脚本
// 运行方式: node scripts/cleanup-data.js

const { Client } = require('pg');

async function cleanup() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();
    console.log('✅ 连接数据库成功');

    // 先查询实际的表名
    const tableResult = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename LIKE 'zhao_%'
    `);
    
    console.log('找到的表:', tableResult.rows.map(r => r.tablename).join(', '));

    // 清空顺序：先清子表，再清主表（按外键依赖关系）
    const tables = [
      // 课时进度
      'zhao_lesson_progresses',
      // 课程进度
      'zhao_course_progresses',
      // 课时
      'zhao_course_lessons',
      // 课程
      'zhao_courses',
      // 课程分类
      'zhao_course_categories',
      // 积分记录
      'zhao_point_records',
    ];

    for (const table of tables) {
      await client.query(`DELETE FROM ${table};`);
      console.log(`✅ 清空表: ${table}`);
    }

    console.log('\n🎉 所有课程相关数据已清空！');
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanup();
