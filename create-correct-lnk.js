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

  // 先删除我之前错误创建的表
  await client.query('DROP TABLE IF EXISTS zhao_courses_zhao_tags_knowledge_points_lnk');
  console.log('已删除错误的表');

  // 创建 Strapi 期望的关联表
  const createTable = `
    CREATE TABLE IF NOT EXISTS "zhao_knowledge_points_course_lnk" (
      "id" SERIAL PRIMARY KEY,
      "course_id" INTEGER NOT NULL REFERENCES "zhao_courses"("id") ON DELETE CASCADE,
      "knowledge_point_id" INTEGER NOT NULL REFERENCES "zhao_tags"("id") ON DELETE CASCADE,
      "knowledge_point_ord" INTEGER NOT NULL DEFAULT 0,
      UNIQUE ("course_id", "knowledge_point_id")
    )
  `;

  console.log('正在创建正确的关联表...');
  await client.query(createTable);
  console.log('已创建 zhao_knowledge_points_course_lnk');

  await client.end();
  console.log('操作完成');
}

main().catch(console.error);
