#!/usr/bin/env node
const { Client } = require('/www/apps/strapi/node_modules/pg');
const c = new Client({ host: '127.0.0.1', port: 5432, database: 'strapi', user: 'strapi', password: '__DB_PASSWORD__', ssl: false });
(async () => {
  await c.connect();
  // 备份值(8-30)中微信配置的完整 extra_config
  console.log('BACKUP_WECHAT_ROW:');
  console.log(JSON.stringify({
    provider:'wechat', app_type:'official_account', app_id:'wx17d58d73062d1899',
    app_secret='__REDACTED__',
    extra_config:{ token:'', authUpgrade:true, oauthScopes:['snsapi_userinfo','snsapi_base'], encodingAESKey:'' }
  }));
  // 现库是否有任何 wechat 残留引用
  const r = await c.query(`SELECT provider, count(*) n FROM sso_oauth_configs GROUP BY provider`);
  console.log('CURRENT_OAUTH_C', r.rows);
  await c.end();
})().catch(e => { console.error('FATAL', e); process.exit(1); });