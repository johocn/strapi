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

  // 删除错误的关联表（如果存在）
  console.log('正在删除现有关联表...');
  await client.query('DROP TABLE IF EXISTS zhao_knowledge_points_course_lnk');
  await client.query('DROP TABLE IF EXISTS zhao_courses_knowledge_points_lnk');
  console.log('已删除所有知识点关联表');

  await client.end();
  console.log('\n操作完成，重启 Strapi 服务后会自动创建正确的表');
}

main().catch(console.error);
