'use strict';
/* 临时验证脚本（不提交）：最终核对 + 第三次触发观察幂等性 */
import { execSync } from 'node:child_process';

const BASE = 'http://127.0.0.1:1337';
const PRODUCT_ID = 5;
const CREDS = [
  { identifier: 'zhao', password: '__PASSWORD__' },
  { identifier: 'admin', password: '__ADMIN_PASSWORD__' },
  { identifier: 'admin', password: '__PASSWORD__' },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

function psql(sql) {
  try {
    return execSync(`docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c "${sql}"`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\n+$/, '');
  } catch (e) { log('[psql] 失败:', e.message.split('\n')[0]); return ''; }
}
const psqlRows = (sql) => psql(sql).split('\n').map((l) => l.trim()).filter(Boolean);
const navCount = () => parseInt(psql(`SELECT COUNT(*) FROM wealth_navs n JOIN wealth_navs_product_lnk l ON l.wealth_nav_id=n.id WHERE l.wealth_product_id=${PRODUCT_ID}`), 10) || 0;
const lastCollectTime = () => psql(`SELECT c.last_collect_time FROM wealth_collect_configs c JOIN wealth_collect_configs_product_lnk l ON l.wealth_collect_config_id=c.id WHERE l.wealth_product_id=${PRODUCT_ID}`).trim();

async function api(path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
async function login() {
  for (const c of CREDS) {
    try {
      const r = await api('/api/zhao-auth/v1/admin/auth/local', { body: c });
      if (r.json && r.json.jwt) return r.json.jwt;
    } catch {}
  }
  throw new Error('登录失败');
}

async function pollStable(getter, label, ms) {
  const deadline = Date.now() + ms;
  let last = getter(), stable = 0;
  while (Date.now() < deadline) {
    await sleep(5000);
    const c = getter();
    if (c !== last) { last = c; stable = 0; log(`[poll] ${label}: ${last} -> ${c}`); }
    else if (++stable >= 2 && last > 0) { log(`[poll] ${label} 稳定=${last}`); return last; }
  }
  log(`[poll] ${label} 超时=${last}`);
  return last;
}

async function main() {
  log('===== 最终核对 =====');
  log('[final] 净值条数:', navCount());
  log('[final] 最新5条 (nav_date|unit_nav|acc_nav|annual_yield):');
  for (const row of psqlRows(`SELECT nav_date || '|' || unit_nav || '|' || COALESCE(acc_nav::text,'') || '|' || COALESCE(annual_yield::text,'') FROM wealth_navs n JOIN wealth_navs_product_lnk l ON l.wealth_nav_id=n.id WHERE l.wealth_product_id=${PRODUCT_ID} ORDER BY nav_date DESC LIMIT 5`)) log('  ', row);
  log('[final] 最早3条:');
  for (const row of psqlRows(`SELECT nav_date || '|' || unit_nav || '|' || COALESCE(annual_yield::text,'') FROM wealth_navs n JOIN wealth_navs_product_lnk l ON l.wealth_nav_id=n.id WHERE l.wealth_product_id=${PRODUCT_ID} ORDER BY nav_date ASC LIMIT 3`)) log('  ', row);
  log('[final] 年化快照数:', psql(`SELECT COUNT(*) FROM wealth_annual_snapshots_product_lnk WHERE wealth_product_id=${PRODUCT_ID}`));
  log('[final] 风险指标数:', psql(`SELECT COUNT(*) FROM wealth_risk_metrics_product_lnk WHERE wealth_product_id=${PRODUCT_ID}`));
  log('[final] 年化快照样例:');
  for (const row of psqlRows(`SELECT s.snapshot_date || '|' || s.annual_1_d || '|' || s.annual_7_d || '|' || s.annual_1_m FROM wealth_annual_snapshots s JOIN wealth_annual_snapshots_product_lnk l ON l.wealth_annual_snapshot_id=s.id WHERE l.wealth_product_id=${PRODUCT_ID} ORDER BY s.snapshot_date DESC LIMIT 3`)) log('  ', row);
  log('[final] 采集配置:', psqlRows(`SELECT c.id || '|' || c.collect_status || '|' || c.collect_rules || '|' || c.last_insert_count || '|' || c.last_update_count || '|' || c.last_collect_time FROM wealth_collect_configs c JOIN wealth_collect_configs_product_lnk l ON l.wealth_collect_config_id=c.id WHERE l.wealth_product_id=${PRODUCT_ID}`).join(' | '));

  log('===== 第三次触发（幂等观察）=====');
  const token = await login();
  const before = lastCollectTime();
  const r = await api('/api/zhao-wealth/v1/admin/collect/trigger', { body: { productId: PRODUCT_ID }, token });
  log('[trigger3] 返回:', JSON.stringify(r.json));
  await pollStable(navCount, 'navs(t3)', 180000);
  // 等待配置落定
  const dl = Date.now() + 90000;
  while (Date.now() < dl) {
    const v = lastCollectTime();
    if (v && v !== before) { log('[poll] 配置已更新 last_collect_time=', v); break; }
    await sleep(3000);
  }
  const cfg = psqlRows(`SELECT c.collect_status || '|' || c.last_insert_count || '|' || c.last_update_count || '|' || c.last_collect_time || '|' || COALESCE(c.fail_reason,'') FROM wealth_collect_configs c JOIN wealth_collect_configs_product_lnk l ON l.wealth_collect_config_id=c.id WHERE l.wealth_product_id=${PRODUCT_ID}`).join(' | ');
  log('[trigger3] 采集配置:', cfg);
  log('[trigger3] 最终净值条数:', navCount());
}

main().catch((e) => { log('[fatal]', e.message); process.exit(1); });
