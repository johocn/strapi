const { Client } = require('pg');

const c = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'admin',
});

async function main() {
  await c.connect();
  
  // 给 oauth_state 补上默认值（Strapi dev migration 只加列不补约束）
  try {
    await c.query("ALTER TABLE zhao_publish_accounts ALTER COLUMN oauth_state SET DEFAULT 'unauthorized'");
    console.log('ALTER OK: oauth_state default set');
  } catch (e) {
    console.log('ALTER warn (may already exist):', e.message);
  }

  // 也看看 Strapi 的 enumeration 是否创建了 CHECK 约束
  const cons = await c.query(`
    SELECT conname, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'zhao_publish_accounts'::regclass 
    AND conname LIKE '%oauth%'
  `);
  console.log('\n=== oauth_state constraints ===');
  console.log(JSON.stringify(cons.rows, null, 2));

  // 最终确认所有 7 个字段
  const all = await c.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='zhao_publish_accounts' 
    AND (column_name LIKE 'oauth_%' OR column_name = 'last_refresh_at')
    ORDER BY column_name
  `);
  console.log(`\n=== All OAuth-related fields (${all.rows.length}) ===`);
  all.rows.forEach(r => console.log(' -', r.column_name));

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
