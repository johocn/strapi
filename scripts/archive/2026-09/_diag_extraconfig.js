#!/usr/bin/env node
const { Client } = require('/www/apps/strapi/node_modules/pg');
const c = new Client({ host: '127.0.0.1', port: 5432, database: 'strapi', user: 'strapi', password: '__DB_PASSWORD__', ssl: false });
(async () => {
  await c.connect();
  const r = await c.query(`SELECT id, site_name, document_id, extra_config, module_visibility FROM zhao_site_configs WHERE domain='v.joho.cn'`);
  const row = r.rows[0];
  if (!row) { console.log('NOT_FOUND'); await c.end(); return; }
  const ec = row.extra_config;
  console.log('SITE', row.site_name, row.document_id);
  console.log('EXTRA_KEYS', JSON.stringify({
    total: Object.keys(ec).length,
    numericKeys: Object.keys(ec).filter(k => /^\d+$/.test(k)).length,
    realKeys: Object.keys(ec).filter(k => !/^\d+$/.test(k)),
  }));
  // 还原损坏段（数字 key 按序拼接）看它到底想表达什么
  const numeric = Object.keys(ec).filter(k => /^\d+$/.test(k)).sort((a,b)=>a-b);
  const joined = numeric.map(k => ec[k]).join('');
  console.log('DAMAGED_JOINED', JSON.stringify(joined));
  console.log('MODULE_VISIBILITY', JSON.stringify(row.module_visibility));
  await c.end();
})().catch(e => { console.error('FATAL', e); process.exit(1); });