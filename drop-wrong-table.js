const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'admin',
});

async function main() {
  await client.connect();

  // 删除错误的关联表
  console.log('正在删除错误的关联表...');
  await client.query('DROP TABLE IF EXISTS zhao_knowledge_points_course_lnk');
  console.log('已删除 zhao_knowledge_points_course_lnk');

  // 检查正确的表结构
  const correctTable = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'zhao_courses_knowledge_points_lnk'
  `);
  console.log('\n正确的关联表结构:');
  console.table(correctTable.rows);

  await client.end();
  console.log('\n操作完成');
}

main().catch(console.error);
