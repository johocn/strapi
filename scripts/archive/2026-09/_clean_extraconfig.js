#!/usr/bin/env node
const { Client } = require('/www/apps/strapi/node_modules/pg');
const c = new Client({ host: '127.0.0.1', port: 5432, database: 'strapi', user: 'strapi', password: '__DB_PASSWORD__', ssl: false });
(async () => {
  await c.connect();
  const r = await c.query(`SELECT id, extra_config FROM zhao_site_configs WHERE domain='v.joho.cn'`);
  const row = r.rows[0];
  if (!row) { console.log('NOT_FOUND'); await c.end(); return; }
  const ec = row.extra_config || {};
  const cleaned = {};
  for (const [k, v] of Object.entries(ec)) {
    if (/^\d+$/.test(k)) continue; // 丢弃损坏数字 key
    cleaned[k] = v;
  }
  const before = Object.keys(ec).length;
  const after = Object.keys(cleaned).length;
  await c.query(`UPDATE zhao_site_configs SET extra_config=$1, updated_at=now() WHERE id=$2`, [cleaned, row.id]);

  const check = await c.query(`SELECT id, extra_config FROM zhao_site_configs WHERE domain='v.joho.cn'`);
  const ck = check.rows[0].extra_config;
  console.log('BEFORE', before, 'AFTER', after);
  console.log('REMAINING_KEYS', JSON.stringify(Object.keys(ck)));
  console.log('REMAINING_JSON', JSON.stringify(ck));
  await c.end();
})().catch(e => { console.error('FATAL', e); process.exit(1); });