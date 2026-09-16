// 冷启动后单独重测：策略 D（goto JSON 直读，含 Referer 对照）+ list.json 字段
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

const P1_URL = `${BASE}/ningbo-web/product/funddaytable.json?code=${CODE}&startdate=2020-01-01&enddate=${ENDDATE}&request_num=100&request_pageno=1`;
const LIST_URL = `${BASE}/ningbo-web/product/list.json?projectcode=${CODE}`;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

async function newPage(browser, extraHeaders) {
  const ctx = await browser.newContext({ userAgent: UA });
  if (extraHeaders) await ctx.setExtraHTTPHeaders(extraHeaders);
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  return { ctx, page };
}

async function main() {
  const waitSec = Number(process.argv[2] || 90);
  console.log(`[D2] 等待冷却 ${waitSec}s 后开始 (enddate=${ENDDATE})`);
  await sleep(waitSec * 1000);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  console.log('[D2] browser launched');

  // 1. 策略 D 原始：goto JSON URL（无 Referer）
  {
    const { ctx, page } = await newPage(browser);
    const st = Date.now();
    try {
      const resp = await page.goto(P1_URL, { waitUntil: 'domcontentloaded' });
      const status = resp ? resp.status() : -1;
      const title = await page.title().catch(() => '');
      const ct = resp ? (resp.headers()['content-type'] || '') : '';
      const body = await page.evaluate(() => document.body.innerText);
      let j = null;
      try { j = JSON.parse(body); } catch { }
      const list = j && Array.isArray(j.list) ? j.list : [];
      console.log(`[D2] D原始(goto JSON,无Referer): ${j ? '成功' : '失败'} status=${status} ct=${ct} title=${title || ''} list=${list.length} 耗时${((Date.now() - st) / 1000).toFixed(1)}s`);
      if (list.length) console.log(`[D2]   首条=${JSON.stringify({ navDate: fmtDate(list[0].cdate), unitNav: list[0].netvalue, accNav: list[0].totalnetvalue, incomeratio: list[0].incomeratio })}`);
    } catch (e) {
      console.log(`[D2] D原始(goto JSON): 失败 err=${errShort(e)} 耗时${((Date.now() - st) / 1000).toFixed(1)}s`);
    }
    await ctx.close().catch(() => {});
    await sleep(6000);
  }

  // 2. 策略 D 带 Referer：goto JSON URL（Referer=详情页）
  {
    const { ctx, page } = await newPage(browser, { Referer: DETAIL_URL });
    const st = Date.now();
    try {
      const resp = await page.goto(P1_URL, { waitUntil: 'domcontentloaded' });
      const status = resp ? resp.status() : -1;
      const title = await page.title().catch(() => '');
      const ct = resp ? (resp.headers()['content-type'] || '') : '';
      const body = await page.evaluate(() => document.body.innerText);
      let j = null;
      try { j = JSON.parse(body); } catch { }
      const list = j && Array.isArray(j.list) ? j.list : [];
      console.log(`[D2] D带Referer(goto JSON): ${j ? '成功' : '失败'} status=${status} ct=${ct} title=${title || ''} list=${list.length} 耗时${((Date.now() - st) / 1000).toFixed(1)}s`);
      if (list.length) console.log(`[D2]   首条=${JSON.stringify({ navDate: fmtDate(list[0].cdate), unitNav: list[0].netvalue, accNav: list[0].totalnetvalue, incomeratio: list[0].incomeratio })}`);
    } catch (e) {
      console.log(`[D2] D带Referer(goto JSON): 失败 err=${errShort(e)} 耗时${((Date.now() - st) / 1000).toFixed(1)}s`);
    }
    await ctx.close().catch(() => {});
    await sleep(6000);
  }

  // 3. list.json（evaluate fetch，先 goto 详情页）
  {
    const { ctx, page } = await newPage(browser);
    const st = Date.now();
    try {
      await page.goto(DETAIL_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      const r = await page.evaluate(async (u) => {
        const res = await fetch(u, { cache: 'no-store' });
        return { status: res.status, text: await res.text() };
      }, LIST_URL);
      let j = null;
      try { j = JSON.parse(r.text); } catch { }
      if (j) {
        const arr = Array.isArray(j.list) ? j.list : [];
        const first = arr[0] || {};
        console.log(`[D2] list.json: status=${r.status} total=${j.total} listLen=${arr.length} 耗时${((Date.now() - st) / 1000).toFixed(1)}s`);
        const pick = {};
        for (const k of ['productName', 'registerCode', 'risklevelDesc', 'riskLevelDesc', 'risklevel', 'registerDate', 'projectcode', 'productcode']) {
          if (first[k] !== undefined) pick[k] = first[k];
        }
        console.log(`[D2]   list[0]目标字段=${JSON.stringify(pick)}`);
        const scalar = {};
        for (const k of Object.keys(first)) {
          const v = first[k];
          if (v === null || v === undefined || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') scalar[k] = v;
        }
        console.log(`[D2]   list[0]标量字段=${JSON.stringify(scalar)}`);
      } else {
        console.log(`[D2] list.json: 非JSON status=${r.status} head=${r.text.slice(0, 120)}`);
      }
    } catch (e) {
      console.log(`[D2] list.json: 失败 err=${errShort(e)}`);
    }
    await ctx.close().catch(() => {});
  }

  await browser.close().catch(() => {});
  console.log('[D2] done');
}

main().catch((e) => { console.error('[D2] 致命错误:', errShort(e)); process.exit(1); });
