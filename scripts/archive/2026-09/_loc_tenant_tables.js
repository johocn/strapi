const { Client } = require('pg');
(async () => {
  const c = new Client({ host: '127.0.0.1', port: 5432, user: 'postgres', password: 'admin', database: 'strapi' });
  await c.connect();
  const tables = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%tenant%' OR table_name ILIKE '%org%' ORDER BY table_name`);
  console.log('TENANT_LIKE_TABLES', JSON.stringify(tables.rows));
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });