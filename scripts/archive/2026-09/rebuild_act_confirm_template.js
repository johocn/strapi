#!/usr/bin/env node
// 切换 act_confirm 模板为「会议报名成功通知」EBB10k，字段 thing2/thing4/time6（跳过 const12）
// 运行：cd /www/apps/strapi && node rebuild_act_confirm_template.js
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(async () => {
  const envStr = fs.readFileSync('/www/apps/strapi/.env', 'utf8');
  const get = (k) => (envStr.split(/\r?\n/).find((l) => l.startsWith(k + '=')) || '').split('=').slice(1).join('=').trim();
  const client = new Client({
    host: get('DATABASE_HOST') || '127.0.0.1',
    port: Number(get('DATABASE_PORT')) || 5432,
    database: get('DATABASE_NAME') || 'strapi',
    user: get('DATABASE_USERNAME') || 'strapi',
    password: get('DATABASE_PASSWORD'),
  });
  await client.connect();
  const fields = JSON.stringify([
    { key: 'activityName', name: 'thing2' },
    { key: 'activityLocation', name: 'thing4' },
    { key: 'timeRange', name: 'time6' },
  ]);
  const r = await client.query(
    `update sso_msg_templates set wx_template_id=$1, wx_template_fields=$2::jsonb where code='act_confirm' returning id, code, wx_template_id, wx_template_fields`,
    ['EBB10k3Lpl-u8su8dFeK5Y_E8F88hn93FTzhtXeAsgQ', fields]
  );
  console.log('UPDATED', JSON.stringify(r.rows));
  await client.end();
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });