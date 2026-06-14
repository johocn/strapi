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

  // 删除旧的关联表
  console.log('正在删除旧的关联表...');
  await client.query('DROP TABLE IF EXISTS zhao_knowledge_points_course_lnk');
  console.log('已删除 zhao_knowledge_points_course_lnk');

  await client.end();
  console.log('操作完成，需要重启 Strapi 服务以创建新的关联表');
}

main().catch(console.error);
