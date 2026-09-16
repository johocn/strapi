#!/usr/bin/env node
const { Client } = require('/www/apps/strapi/node_modules/pg');
const c = new Client({ host: '127.0.0.1', port: 5432, database: 'strapi', user: 'strapi', password: '__DB_PASSWORD__', ssl: false });
(async () => {
  await c.connect();
  const r = await c.query(`SELECT id, extra_config FROM sso_oauth_configs WHERE provider='wechat' AND app_type='official_account'`);
  const ec = r.rows[0].extra_config || {};
  ec.serverToken = ec.token || '__WECHAT_TOKEN__'; // 验签读 serverToken
  await c.query(`UPDATE sso_oauth_configs SET extra_config=$1, updated_at=now() WHERE id=$2`, [ec, r.rows[0].id]);
  const chk = await c.query(`SELECT extra_config FROM sso_oauth_configs WHERE id=$1`, [r.rows[0].id]);
  console.log('EXTRA_KEYS', Object.keys(chk.rows[0].extra_config));
  console.log('serverToken='__REDACTED__'FATAL', e); process.exit(1); });