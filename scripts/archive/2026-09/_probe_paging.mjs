// 宁银理财 funddaytable 完整翻页行为探测（页面内 evaluate fetch）
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

let browser = null;

async function fetchText(page, url) {
  return page.evaluate(async (u) => {
    const r = await fetch(u, { cache: 'no-store' });
    return { status: r.status, ct: r.headers.get('content-type') || '', text: await r.text() };
  }, url);
}

async function main() {
  console.log(`[PAGE] node ${process.version}, enddate=${ENDDATE}`);
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(DETAIL_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  console.log('[PAGE] 详情页已就绪');

  // A. 完整翻页到空（最多 60 页），num=100
  {
    const rows = [];
    const perPage = [];
    const topKeys = new Set();
    let first = null, last = null;
    for (let pno = 1; pno <= 60; pno++) {
      const url = `${BASE}/ningbo-web/product/funddaytable.json?code=${CODE}&startdate=2020-01-01&enddate=${ENDDATE}&request_num=100&request_pageno=${pno}`;
      const r = await fetchText(page, url);
      let j = null;
      try { j = JSON.parse(r.text); } catch (e) { console.log(`[PAGE] pageno=${pno} 非JSON status=${r.status} head=${r.text.slice(0, 120)}`); break; }
      const list = Array.isArray(j.list) ? j.list : [];
      Object.keys(j).forEach((k) => topKeys.add(k));
      perPage.push(list.length);
      rows.push(...list);
      if (list.length === 0) { console.log(`[PAGE] pageno=${pno} 返回空，停止翻页`); break; }
      if (first === null) first = list[0];
      last = list[list.length - 1];
      if (pno === 1 || pno === 2 || pno === 3 || pno === 5 || pno === 10) {
        console.log(`[PAGE] pageno=${pno}: list=${list.length} 首=${fmtDate(list[0].cdate)} 末=${fmtDate(list[list.length - 1].cdate)}`);
      }
    }
    const n = rows.length;
    const dates = rows.map((r) => fmtDate(r.cdate ?? 0));
    const sorted = [...dates].sort((a, b) => (a < b ? -1 : 1));
    console.log(`[PAGE] 全量: 总条数=${n} 日期范围=${sorted[0]} ~ ${sorted[sorted.length - 1]}`);
    console.log(`[PAGE] 每页条数=[${perPage.join(',')}]`);
    console.log(`[PAGE] 顶层keys=${[...topKeys].join(',')}`);
    console.log(`[PAGE] 首条样本=${JSON.stringify(first)}`);
    console.log(`[PAGE] 末条样本=${JSON.stringify(last)}`);
    const hasInc = rows.filter((r) => r.incomeratio !== undefined && r.incomeratio !== null && r.incomeratio !== '').length;
    console.log(`[PAGE] incomeratio有值=${hasInc}/${n}`);
    const sampleIdx = [0, Math.floor(n / 2), n - 1];
    for (const i of sampleIdx) {
      const r = rows[i];
      console.log(`[PAGE] 样本[${i}]: ${JSON.stringify({ navDate: fmtDate(r.cdate), unitNav: r.netvalue, accNav: r.totalnetvalue, incomeratio: r.incomeratio })}`);
    }
  }

  console.log('---');
  // B. request_num 对第1页条数的影响
  for (const num of [15, 20, 50, 100, 500]) {
    const url = `${BASE}/ningbo-web/product/funddaytable.json?code=${CODE}&startdate=2020-01-01&enddate=${ENDDATE}&request_num=${num}&request_pageno=1`;
    const r = await fetchText(page, url);
    let j = null;
    try { j = JSON.parse(r.text); } catch { }
    const list = j && Array.isArray(j.list) ? j.list : [];
    console.log(`[PAGE] num=${num} pageno=1: list=${list.length} 首=${list.length ? fmtDate(list[0].cdate) : '-'} 末=${list.length ? fmtDate(list[list.length - 1].cdate) : '-'}`);
  }

  console.log('---');
  // C. startdate 生效性（num=100, pageno=1）
  for (const sd of ['2026-08-01', '2026-01-01', '2025-01-01', '2020-01-01']) {
    const url = `${BASE}/ningbo-web/product/funddaytable.json?code=${CODE}&startdate=${sd}&enddate=${ENDDATE}&request_num=100&request_pageno=1`;
    const r = await fetchText(page, url);
    let j = null;
    try { j = JSON.parse(r.text); } catch { }
    const list = j && Array.isArray(j.list) ? j.list : [];
    console.log(`[PAGE] startdate=${sd}: list=${list.length} 首=${list.length ? fmtDate(list[0].cdate) : '-'}`);
  }

  console.log('---');
  // D. 修正版策略 D：goto JSON URL 直读（headers 同步访问）
  {
    const c2 = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    });
    const p2 = await c2.newPage();
    p2.setDefaultTimeout(30000);
    const url = `${BASE}/ningbo-web/product/funddaytable.json?code=${CODE}&startdate=2020-01-01&enddate=${ENDDATE}&request_num=100&request_pageno=1`;
    const st = Date.now();
    try {
      const resp = await p2.goto(url, { waitUntil: 'domcontentloaded' });
      const status = resp ? resp.status() : -1;
      const title = await p2.title().catch(() => '');
      const ct = resp ? (resp.headers()['content-type'] || '') : '';
      const body = await p2.evaluate(() => document.body.innerText);
      let j = null;
      try { j = JSON.parse(body); } catch { }
      const list = j && Array.isArray(j.list) ? j.list : [];
      console.log(`[PAGE] D修正: ${j ? '成功' : '失败'} status=${status} title=${title || ''} ct=${ct} list=${list.length} 耗时${((Date.now() - st) / 1000).toFixed(1)}s`);
      if (list.length) console.log(`[PAGE]   D首条=${JSON.stringify({ navDate: fmtDate(list[0].cdate), unitNav: list[0].netvalue, accNav: list[0].totalnetvalue, incomeratio: list[0].incomeratio })}`);
    } catch (e) {
      console.log(`[PAGE] D修正: 失败 err=${errShort(e)} 耗时${((Date.now() - st) / 1000).toFixed(1)}s`);
    }
    await c2.close().catch(() => {});
  }

  console.log('---');
  // E. list.json 详情（evaluate fetch），打印 list[0] 全字段
  {
    const r = await fetchText(page, `${BASE}/ningbo-web/product/list.json?projectcode=${CODE}`);
    let j = null;
    try { j = JSON.parse(r.text); } catch { }
    if (j) {
      const arr = Array.isArray(j.list) ? j.list : [];
      console.log(`[PAGE] list.json: status=${r.status} total=${j.total} netvalueDate=${j.netvalueDate} listLen=${arr.length}`);
      console.log(`[PAGE] list[0]keys=${arr[0] ? Object.keys(arr[0]).join(',') : '-'}`);
      if (arr[0]) {
        const pick = {};
        for (const k of Object.keys(arr[0])) {
          const v = arr[0][k];
          if (typeof v !== 'object' && typeof v !== 'function') pick[k] = v;
        }
        console.log(`[PAGE] list[0]标量字段=${JSON.stringify(pick)}`);
      }
    } else {
      console.log(`[PAGE] list.json 非JSON status=${r.status} head=${r.text.slice(0, 120)}`);
    }
  }

  await browser.close().catch(() => {});
  console.log('[PAGE] done');
}

main().catch((e) => { console.error('[PAGE] 致命错误:', errShort(e)); process.exit(1); });
