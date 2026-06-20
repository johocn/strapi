const { Client } = require('pg');
const c = new Client({ host:'127.0.0.1', port:5432, database:'strapi', user:'postgres', password:'admin' });
c.connect()
  .then(() => c.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'up_users' AND column_name LIKE '%role%'`))
  .then(r => { console.log('Role columns:', r.rows.map(x => x.column_name)); return c.query(`SELECT id, username, zhao_roles FROM up_users WHERE id = 12`); })
  .then(r => { console.log('Current user:', r.rows); return c.query(`UPDATE up_users SET zhao_roles = '["admin"]' WHERE id = 12 RETURNING id, username, zhao_roles`); })
  .then(r => { console.log('Updated:', r.rows); c.end(); })
  .catch(e => { console.error(e.message); c.end(); });
