const { Client } = require('pg');
const c = new Client({ host: '127.0.0.1', port: 5432, user: 'postgres', password: 'admin', database: 'strapi' });
(async () => {
  await c.connect();
  const au = await c.query('SELECT id, username, email FROM admin_users ORDER BY id');
  console.log('=== admin_users ===');
  au.rows.forEach(r => console.log(r.id, r.username, r.email));
  const op = await c.query('SELECT * FROM zhao_point_records_operator_lnk ORDER BY point_record_id LIMIT 20');
  console.log('=== zhao_point_records_operator_lnk ===');
  op.rows.forEach(r => console.log(JSON.stringify(r)));
  const lnk2 = await c.query('SELECT * FROM zhao_point_records_user_lnk ORDER BY point_record_id LIMIT 20');
  console.log('=== records user lnk ===');
  lnk2.rows.forEach(r => console.log(JSON.stringify(r)));
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });