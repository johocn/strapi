#!/usr/bin/env node
const { Client } = require('/www/apps/strapi/node_modules/pg');
const c = new Client({ host: '127.0.0.1', port: 5432, database: 'strapi', user: 'strapi', password: '__DB_PASSWORD__', ssl: false });
(async () => {
  await c.connect();
  const r = await c.query(`SELECT id, extra_config FROM sso_oauth_configs WHERE provider='wechat' AND app_type='official_account'`);
  const row = r.rows[0];
  if (!row) { console.log('NOT_FOUND'); await c.end(); return; }
  const ec = row.extra_config || {};
  ec.token = '__WECHAT_TOKEN__';
  ec.encodingAESKey = '__WECHAT_AES_KEY__';
  await c.query(
    `UPDATE sso_oauth_configs SET app_secret=$1, extra_config=$2, updated_at=now() WHERE id=$3`,
    ['cd8aa0adb6aefacf4bfa92ada658db41', ec, row.id]
  );
  const chk = await c.query(`SELECT id, provider, app_type, app_id, app_secret, is_enabled, extra_config FROM sso_oauth_configs WHERE id=$1`, [row.id]);
  const ck = chk.rows[0];
  console.log('ID', ck.id);
  console.log('app_id', ck.app_id);
  console.log('app_secret', ck.app_secret, '(len', ck.app_secret.length + ')');
  console.log('token', ck.extra_config.token, '(len', ck.extra_config.token.length + ')');
  console.log('encodingAESKey', ck.extra_config.encodingAESKey, '(len', ck.extra_config.encodingAESKey.length + ')');
  console.log('enabled', ck.is_enabled);
  console.log('oauthScopes', JSON.stringify(ck.extra_config.oauthScopes));
  await c.end();
})().catch(e => { console.error('FATAL', e); process.exit(1); });