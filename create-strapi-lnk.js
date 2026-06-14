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

  // 创建 Strapi 期望的关联表
  const createTable = `
    CREATE TABLE IF NOT EXISTS "zhao_knowledge_points_course_lnk" (
      "id" SERIAL PRIMARY KEY,
      "knowledge_point_id" INTEGER NOT NULL REFERENCES "zhao_tags"("id") ON DELETE CASCADE,
      "course_id" INTEGER NOT NULL REFERENCES "zhao_courses"("id") ON DELETE CASCADE,
      "knowledge_point_ord" INTEGER NOT NULL DEFAULT 0,
      UNIQUE ("knowledge_point_id", "course_id")
    )
  `;

  console.log('正在创建 Strapi 期望的关联表...');
  await client.query(createTable);
  console.log('已创建 zhao_knowledge_points_course_lnk');

  await client.end();
  console.log('\n操作完成');
}

main().catch(console.error);
