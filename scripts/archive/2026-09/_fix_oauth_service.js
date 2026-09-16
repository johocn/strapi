#!/usr/bin/env node
// 在 Strapi 应用上下文内，通过 zhao-sso 插件 service 修复公众号 OAuth 配置
// 使用编译产物 distDir 加载（pm2=strapi start 同款）
const { createStrapi } = require('./node_modules/@strapi/strapi');

async function main() {
  const strapi = await createStrapi({
    appDir: '/www/apps/strapi',
    distDir: '/www/apps/strapi/dist',
    autoReload: false,
  }).load();

  const uid = 'plugin::zhao-sso.sso-oauth-config';
  const row = await strapi.db.query(uid).findOne({
    where: { provider: 'wechat', app_type: 'official_account' },
  });
  if (!row) { console.log('ROW_NOT_FOUND'); process.exit(2); }

  const extra = Object.assign({}, row.extra_config || {}, {
    token: '__WECHAT_TOKEN__',
    serverToken: '__WECHAT_TOKEN__',
    encodingAESKey: '__WECHAT_AES_KEY__',
    oauthScopes: ['snsapi_userinfo', 'snsapi_base'],
    authUpgrade: true,
  });

  const upd = await strapi.db.query(uid).update({
    where: { id: row.id },
    data: {
      app_secret='__REDACTED__',
      extra_config: extra,
      is_enabled: true,
    },
  });

  const chk = await strapi.db.query(uid).findOne({ where: { id: upd.id } });
  console.log('UPDATE_ID', upd.id);
  console.log('document_id', chk.document_id);
  console.log('app_secret', JSON.stringify(chk.app_secret), '(len', chk.app_secret.length + ')');
  console.log('token', JSON.stringify(chk.extra_config.token));
  console.log('serverToken', JSON.stringify(chk.extra_config.serverToken));
  console.log('encodingAESKey', chk.extra_config.encodingAESKey, '(len', chk.extra_config.encodingAESKey.length + ')');
  console.log('oauthScopes', JSON.stringify(chk.extra_config.oauthScopes));
  console.log('is_enabled', chk.is_enabled);
  await strapi.destroy();
  process.exit(0);
}

main().catch((e) => { console.error('FATAL', e && e.message); process.exit(1); });