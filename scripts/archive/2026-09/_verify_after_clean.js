#!/usr/bin/env node
const { Client } = require('/www/apps/strapi/node_modules/pg');
const c = new Client({ host: '127.0.0.1', port: 5432, database: 'strapi', user: 'strapi', password: '__DB_PASSWORD__', ssl: false });
(async () => {
  await c.connect();
  // 1) 备份里的原始损坏段（是否还含有效授权信息）
  const r = await c.query(`SELECT id, extra_config, module_visibility FROM zhao_site_configs WHERE domain='v.joho.cn'`);
  console.log('CURRENT_EXTRA_KEYS', JSON.stringify(Object.keys(r.rows[0].extra_config)));
  console.log('CURRENT_MODULE_VISIBILITY', JSON.stringify(r.rows[0].module_visibility));
  await c.end();
})().catch(e => { console.error('FATAL', e); process.exit(1); });