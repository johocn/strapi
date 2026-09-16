// 端到端验证推荐流程：goto+networkidle → 全量翻页 → list.json（模拟生产采集时序）
'use strict';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/www/apps/strapi/node_modules/playwright');

const BASE = 'https://www.wmbnb.com';
const DETAIL_URL = `${BASE}/product/productdetails/index.html?projectcode=ZGN2660096E`;
const CODE = 'ZGN2660096E';
const today = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const ENDDATE = today();
const fmtDate = (ms) => {
  const d = new Date(Number(ms));
  return isNaN(d.getTime()) ? String(ms) : d.toISOString().slice(0, 10);
};
const errShort = (e) => (e && e.message ? e.message.replace(/\s+/g, ' ').slice(0, 100) : String(e));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
const fundUrl = (pno) => `${BASE}/ningbo-web/product/funddaytable.json?code=${CODE}&startdate=2020-01-01&enddate=${ENDDATE}&request_num=100&request_pageno=${pno}`;

async function runOnce(browser, tag) {
  const ctx = await browser.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const t0 = Date.now();
  try {
    await page.goto(DETAIL_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => console.log(`[FULL ${tag}] networkidle 超时，继续`));
    const waitMs = Date.now() - t0;
    console.log(`[FULL ${tag}] 页面就绪（goto+networkidle 耗时${(waitMs / 1000).toFixed(1)}s）`);

    const rows = [];
    const perPage = [];
    let waf = false;
    for (let pno = 1; pno <= 10; pno++) {
      const r = await page.evaluate(async (u) => {
        const res = await fetch(u, { cache: 'no-store' });
        return { status: res.status, ct: res.headers.get('content-type') || '', text: await res.text() };
      }, fundUrl(pno));
      if (r.status === 403 || (r.ct || '').includes('html')) {
        waf = true;
        console.log(`[FULL ${tag}] pageno=${pno} WAF拦截 status=${r.status} ct=${r.ct} head=${r.text.slice(0, 60)}`);
        break;
      }
      let j = null;
      try { j = JSON.parse(r.text); } catch { waf = true; console.log(`[FULL ${tag}] pageno=${pno} 解析失败 status=${r.status} head=${r.text.slice(0, 60)}`); break; }
      const list = Array.isArray(j.list) ? j.list : [];
      perPage.push(list.length);
      rows.push(...list);
      if (list.length === 0) break;
      await sleep(300);
    }
    if (!waf) {
      const n = rows.length;
      const dates = rows.map((r) => fmtDate(r.cdate ?? 0)).sort((a, b) => (a < b ? -1 : 1));
      const hasInc = rows.filter((r) => r.incomeratio !== undefined && r.incomeratio !== null && r.incomeratio !== '').length;
      console.log(`[FULL ${tag}] 净值全量: 总条数=${n} 日期=${dates[0]} ~ ${dates[n - 1]} incomeratio=${hasInc}/${n} 每页=[${perPage.join(',')}]`);
      for (const i of [0, Math.floor(n / 2), n - 1]) {
        const r = rows[i];
        console.log(`[FULL ${tag}]   样本[${i}]=${JSON.stringify({ navDate: fmtDate(r.cdate), unitNav: r.netvalue, accNav: r.totalnetvalue, incomeratio: r.incomeratio })}`);
      }
      // list.json
      const lr = await page.evaluate(async (u) => {
        const res = await fetch(u, { cache: 'no-store' });
        return { status: res.status, text: await res.text() };
      }, `${BASE}/ningbo-web/product/list.json?projectcode=${CODE}`);
      let lj = null;
      try { lj = JSON.parse(lr.text); } catch { }
      if (lj) {
        const first = (Array.isArray(lj.list) && lj.list[0]) || {};
        console.log(`[FULL ${tag}] list.json: status=${lr.status} total=${lj.total} productName=${first.projectname || first.projectshortname} registerCode≈id=${first.id} risklevel=${first.risklevel} risklevelDesc=${first.risklevelDesc}`);
      } else {
        console.log(`[FULL ${tag}] list.json: 非JSON status=${lr.status}`);
      }
      console.log(`[FULL ${tag}] 完整流程成功，总耗时${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  } catch (e) {
    console.log(`[FULL ${tag}] 失败 err=${errShort(e)}`);
  } finally {
    await ctx.close().catch(() => {});
  }
}

async function main() {
  const waitSec = Number(process.argv[2] || 60);
  console.log(`[FULL] 冷却 ${waitSec}s (enddate=${ENDDATE})`);
  await sleep(waitSec * 1000);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  await runOnce(browser, '第1次');
  console.log('[FULL] 休息 90s 后第 2 次');
  await sleep(90000);
  await runOnce(browser, '第2次');
  await browser.close().catch(() => {});
  console.log('[FULL] done');
}

main().catch((e) => { console.error('[FULL] 致命错误:', errShort(e)); process.exit(1); });
