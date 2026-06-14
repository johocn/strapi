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

  // 检查关联表结构
  const lnkTable = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'zhao_knowledge_points_course_lnk'
  `);
  console.log('关联表结构:');
  console.table(lnkTable.rows);

  // 检查 zhao_tags 表结构
  const tagsTable = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'zhao_tags'
    LIMIT 10
  `);
  console.log('\nzhao_tags 表结构:');
  console.table(tagsTable.rows);

  await client.end();
}

main().catch(console.error);
