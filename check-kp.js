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

  // 课程 documentId
  const courseDocId = 'laudaldvq00tsrx3turx9f1d';

  // 查询所有包含 knowledge 的表
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (table_name LIKE '%knowledge%' OR table_name LIKE '%kp%')
  `);
  console.log('知识点相关表:');
  console.table(tables.rows);

  // 查询关联表结构
  const linkTableStruct = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'zhao_knowledge_points_course_lnk'
  `);
  console.log('\n关联表结构:');
  console.table(linkTableStruct.rows);

  // 查询课程关联的知识点
  const query = `
    SELECT
      c.title,
      c.document_id as course_doc_id,
      kp.document_id as kp_doc_id,
      kp.name as kp_name,
      kp.created_at
    FROM zhao_courses c
    LEFT JOIN zhao_knowledge_points_course_lnk l ON c.id = l.course_id
    LEFT JOIN zhao_knowledge_points kp ON l.knowledge_point_id = kp.id
    WHERE c.document_id = $1
  `;

  const result = await client.query(query, [courseDocId]);
  console.log('\n课程关联的知识点:');
  console.table(result.rows);

  // 查询知识点表中的所有记录
  const allKps = await client.query('SELECT document_id, name FROM zhao_knowledge_points ORDER BY created_at DESC LIMIT 20');
  console.log('\n知识点表最近记录:');
  console.table(allKps.rows);

  await client.end();
}

main().catch(console.error);
