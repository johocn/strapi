const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'admin',
});

async function checkTables() {
  await client.connect();
  
  // 检查知识点表是否存在
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%knowledge%'
  `);
  
  console.log('知识点相关表:');
  tables.rows.forEach(row => {
    console.log(`  - ${row.table_name}`);
  });
  
  await client.end();
}

checkTables().catch(console.error);
