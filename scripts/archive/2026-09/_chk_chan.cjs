const { Pool } = require('pg'); require('dotenv').config({ path: '.env' });
(async () => {
  const p = new Pool({ host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT), database: process.env.DATABASE_NAME, user: process.env.DATABASE_USERNAME, password: process.env.DATABASE_PASSWORD });
  const u = await p.query(`SELECT * FROM zhao_channel_members_user_lnk`);
  console.log('member-user:', JSON.stringify(u.rows));
  const c = await p.query(`SELECT * FROM zhao_channel_members_channel_lnk`);
  console.log('member-channel:', JSON.stringify(c.rows));
  const ch = await p.query(`SELECT id, document_id, name FROM zhao_channels ORDER BY id`);
  console.log('channels:', JSON.stringify(ch.rows));
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });