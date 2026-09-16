#!/usr/bin/env node
const { createStrapi } = require('./node_modules/@strapi/strapi');

async function main() {
  const strapi = await createStrapi({
    appDir: '/www/apps/strapi',
    distDir: '/www/apps/strapi/dist',
    autoReload: false,
  }).load();
  const uid = 'plugin::zhao-sso.sso-oauth-config';
  const row = await strapi.db.query(uid).findOne({ where: { provider: 'wechat', app_type: 'official_account' } });
  if (!row) { console.log('ROW_NOT_FOUND'); process.exit(2); }
  console.log('BEFORE extra_config =', JSON.stringify(row.extra_config));

  const extra = Object.assign({}, row.extra_config || {}, {
    token: '__WECHAT_TOKEN__',
    serverToken: '__WECHAT_TOKEN__',
    encodingAESKey: '__WECHAT_AES_KEY__',
  });

  await strapi.db.query(uid).update({ where: { id: row.id }, data: { extra_config: extra } });

  const chk = await strapi.db.query(uid).findOne({ where: { id: row.id } });
  console.log('AFTER  extra_config =', JSON.stringify(chk.extra_config));
  console.log('SERVERTOKEN_PRESENT =', !!chk.extra_config.serverToken);
  await strapi.destroy();
  process.exit(0);
}
main().catch((e) => { console.error('FATAL', e && e.message); process.exit(1); });