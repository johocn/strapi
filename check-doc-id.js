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

  // 检查知识点标签是否存在
  const kpDocId = 'kihe0rryvpipb0e7k35m02us';
  const result = await client.query(
    'SELECT id, document_id, name FROM zhao_tags WHERE document_id = $1',
    [kpDocId]
  );
  
  console.log('知识点标签查询结果:');
  console.table(result.rows);

  // 检查课程是否存在
  const courseDocId = 'laudaldvq00tsrx3turx9f1d';
  const courseResult = await client.query(
    'SELECT id, document_id, title FROM zhao_courses WHERE document_id = $1',
    [courseDocId]
  );
  
  console.log('\n课程查询结果:');
  console.table(courseResult.rows);

  await client.end();
}

main().catch(console.error);
