#!/usr/bin/env node
const { Client } = require('/www/apps/strapi/node_modules/pg');
(async () => {
  const c = await new Client({ host:'127.0.0.1', port:5432, database:'strapi', user:'strapi', password:'__DB_PASSWORD__', ssl:false }).connect();
  const r = await c.query(`SELECT extra_config FROM sso_oauth_configs WHERE provider='wechat' AND app_type='official_account'`);
  console.log('SERVERTOKEN_IN_DB =', r.rows[0].extra_config.serverToken);
  console.log('TOKEN_IN_DB      =', r.rows[0].extra_config.token);
  console.log('harcoded_script  = __WECHAT_TOKEN__');
  await c.end();
})();