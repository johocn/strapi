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

  // 查询所有包含 course 和 tag 的关联表
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (table_name LIKE '%course%tag%' OR table_name LIKE '%tag%course%')
  `);
  console.log('课程标签关联表:');
  console.table(tables.rows);

  // 检查是否有 knowledgePoints 相关的关联表
  const kpTables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%knowledge%'
  `);
  console.log('\n知识点相关表:');
  console.table(kpTables.rows);

  await client.end();
}

main().catch(console.error);
