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

  // 创建新的 manyToMany 关联表
  const createTable = `
    CREATE TABLE IF NOT EXISTS "zhao_courses_zhao_tags_knowledge_points_lnk" (
      "id" SERIAL PRIMARY KEY,
      "course_id" INTEGER NOT NULL REFERENCES "zhao_courses"("id") ON DELETE CASCADE,
      "zhao_tag_id" INTEGER NOT NULL REFERENCES "zhao_tags"("id") ON DELETE CASCADE,
      "knowledge_points_ord" INTEGER NOT NULL DEFAULT 0,
      UNIQUE ("course_id", "zhao_tag_id")
    )
  `;

  console.log('正在创建新的关联表...');
  await client.query(createTable);
  console.log('已创建 zhao_courses_zhao_tags_knowledge_points_lnk');

  await client.end();
  console.log('操作完成');
}

main().catch(console.error);
