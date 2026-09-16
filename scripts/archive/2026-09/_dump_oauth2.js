#!/usr/bin/env node
const { Client } = require('/www/apps/strapi/node_modules/pg');
(async () => {
  const c = await Client();
  await c.connect({ host: '127.0.0.1', port: 5432, database: 'strapi', user: 'strapi', password: '__DB_PASSWORD__', ssl: false });
  const r = await c.query(`SELECT id, app_secret, extra_config, document_id FROM sso_oauth_configs WHERE provider='wechat'`);
  const row = r.rows[0];
  console.log('document_id', row.document_id);
  console.log('app_secret CURRENT=', JSON.stringify(row.app_secret));
  console.log('app_secret EXPECT= cd8aa0adb6aefacf4bfa92ada658db41 (len 32)');
  console.log('token CURRENT=', JSON.stringify(row.extra_config.token));
  console.log('serverToken CURRENT=', JSON.stringify(row.extra_config.serverToken));
  await c.end();
})().catch(e => { console.error('FATAL', e); process.exit(1); });