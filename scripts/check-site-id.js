const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();
    
    // 检查 site_id 列
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'zhao_channels'
      AND column_name LIKE '%site%'
    `);
    console.log('site 相关列:', JSON.stringify(res.rows, null, 2));
    
    // 检查所有列
    const cols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'zhao_channels'
      ORDER BY ordinal_position
    `);
    console.log('zhao_channels 所有列:', cols.rows.map(r => r.column_name).join(', '));
    
    // 检查 zhao_schema_migrations 表
    const migrations = await client.query(`
      SELECT * FROM zhao_schema_migrations ORDER BY id
    `);
    console.log('已执行的迁移:', JSON.stringify(migrations.rows, null, 2));
    
  } finally {
    await client.end();
  }
}

main().catch(console.error);
