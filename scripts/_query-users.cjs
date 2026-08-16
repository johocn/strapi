const { Client } = require('pg');
const c = new Client({ host: '127.0.0.1', port: 5432, user: 'postgres', password: 'admin', database: 'strapi' });
(async () => {
  await c.connect();
  const up = await c.query('SELECT id, username, email FROM up_users ORDER BY id');
  console.log('=== up_users ===');
  up.rows.forEach(r => console.log(r.id, r.username, r.email));
  const sso = await c.query('SELECT id, uuid, username, email, mobile FROM sso_users ORDER BY id');
  console.log('=== sso_users ===');
  sso.rows.forEach(r => console.log(r.id, r.username, r.email, r.mobile));
  const lnk = await c.query('SELECT * FROM zhao_point_records_user_lnk ORDER BY point_record_id LIMIT 20');
  console.log('=== zhao_point_records_user_lnk ===');
  lnk.rows.forEach(r => console.log(JSON.stringify(r)));
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });