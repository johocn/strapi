// 宁银理财官网净值采集策略探测脚本（只读，不写库）
// 在 joho 服务器上用服务器自带 playwright 执行
'use strict';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/www/apps/strapi/node_modules/playwright');

const BASE = 'https://www.wmbnb.com';
const DETAIL_URL = `${BASE}/product/productdetails/index.html?projectcode=ZGN2660096E`;
const CODE = 'ZGN2660096E';
const STARTDATE = '2020-01-01';
const todayStr = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const ENDDATE = todayStr();

const P1_URL = `${BASE}/ningbo-web/product/funddaytable.json?code=${CODE}&startdate=${STARTDATE}&enddate=${ENDDATE}&request_num=100&request_pageno=1`;
const LIST_URL = `${BASE}/ningbo-web/product/list.json?projectcode=${CODE}`;

const t0 = Date.now();
const elapsed = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';
const errShort = (e) => {
  const m = e && e.message ? e.message : String(e);
  return m.replace(/\s+/g, ' ').slice(0, 100);
};

let browser = null;

// 在页面里 fetch 同源接口，返回 {status, ct, text}
const pageFetch = (page, url, timeout = 30000) =>
  page.evaluate(
    async ({ u, t }) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), t);
      try {
        const r = await fetch(u, { signal: ctrl.signal, cache: 'no-store' });
        const text = await r.text();
        return { status: r.status, ct: r.headers.get('content-type') || '', text };
      } finally {
        clearTimeout(timer);
      }
    },
    { u: url, t: timeout }
  );

function parseFundPage(text) {
  try {
    const j = JSON.parse(text);
    const list = Array.isArray(j.list) ? j.list : [];
    return { ok: true, list, keys: list.length ? Object.keys(list[0]) : [] };
  } catch (e) {
    return { ok: false, err: errShort(e) };
  }
}

const fmtDate = (ms) => {
  const d = new Date(Number(ms));
  if (isNaN(d.getTime())) return String(ms);
  return d.toISOString().slice(0, 10);
};

// 单页 funddaytable 采样
async function fetchPage1(page, waitFn) {
  if (waitFn) await waitFn(page);
  const r = await pageFetch(page, P1_URL);
  const p = parseFundPage(r.text);
  return { status: r.status, ct: r.ct.slice(0, 40), ...p, rawLen: r.text.length };
}

// 翻页拉全量
async function fetchAll(page, pagenoUrl) {
  const rows = [];
  const perPage = [];
  let emptyPages = 0;
  for (let pno = 1; pno <= 20; pno++) {
    const url = pagenoUrl
      ? pagenoUrl(pno)
      : `${BASE}/ningbo-web/product/funddaytable.json?code=${CODE}&startdate=${STARTDATE}&enddate=${ENDDATE}&request_num=100&request_pageno=${pno}`;
    const r = await pageFetch(page, url, 20000);
    const p = parseFundPage(r.text);
    if (!p.ok) return { ok: false, err: `page${pno} parse: ${p.err}`, got: rows.length };
    perPage.push(p.list.length);
    rows.push(...p.list);
    if (p.list.length === 0) { emptyPages++; break; }
    if (p.list.length > 0 && p.list.length < 100) { emptyPages++; break; } // 不足一页视为末尾
  }
  return { ok: true, rows, perPage, emptyPages };
}

function summarizeRows(rows) {
  const n = rows.length;
  const dates = rows.map((r) => fmtDate(r.cdate ?? r.navDate ?? 0));
  const withInc = rows.filter((r) => r.incomeratio !== undefined && r.incomeratio !== null && r.incomeratio !== '');
  const byDate = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const sorted = [...dates].sort(byDate);
  const sample = [];
  for (const idx of [0, Math.floor(n / 2), n - 1]) {
    const r = rows[idx];
    if (!r) continue;
    sample.push({
      navDate: fmtDate(r.cdate ?? r.navDate ?? 0),
      unitNav: r.netvalue ?? r.unitNav ?? null,
      accNav: r.totalnetvalue ?? r.accNav ?? null,
      incomeratio: r.incomeratio ?? null,
    });
  }
  return {
    total: n,
    earliest: sorted[0],
    latest: sorted[sorted.length - 1],
    incomeratioCount: withInc.length,
    sample,
  };
}

async function runStrategy(name, makeWait) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const st = Date.now();
  try {
    await page.goto(DETAIL_URL, { waitUntil: 'domcontentloaded' });
    const r = await fetchPage1(page, makeWait);
    return { name, ok: true, ms: Date.now() - st, ...r };
  } catch (e) {
    return { name, ok: false, ms: Date.now() - st, err: errShort(e) };
  } finally {
    await context.close().catch(() => {});
  }
}

async function strategyD() {
  // 直接 goto JSON URL，读 innerText 解析
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const st = Date.now();
  try {
    const resp = await page.goto(P1_URL, { waitUntil: 'domcontentloaded' });
    const status = resp ? resp.status() : -1;
    const title = await page.title().catch(() => '');
    const body = await page.evaluate(() => document.body.innerText);
    const p = parseFundPage(body);
    return { name: 'D', ok: p.ok, ms: Date.now() - st, status, title, ct: await resp.headers().then((h) => h['content-type'] || '').catch(() => ''), ...p, rawLen: body.length };
  } catch (e) {
    return { name: 'D', ok: false, ms: Date.now() - st, err: errShort(e) };
  } finally {
    await context.close().catch(() => {});
  }
}

async function strategyE() {
  // 策略 A + 捕获 Execution context destroyed 后重试 goto+evaluate，最多 3 次
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const st = Date.now();
    try {
      await page.goto(DETAIL_URL, { waitUntil: 'domcontentloaded' });
      const r = await fetchPage1(page, null);
      await context.close().catch(() => {});
      return { name: 'E', ok: true, attempt, ms: Date.now() - st, ...r };
    } catch (e) {
      last = errShort(e);
      const msg = e && e.message ? e.message : String(e);
      console.log(`[PROBE] E 第${attempt}次失败: ${errShort(e)}`);
      await context.close().catch(() => {});
      if (!/Execution context was destroyed|Execution context is not available/i.test(msg)) {
        // 非上下文销毁类错误，不再重试
        return { name: 'E', ok: false, attempt, err: last };
      }
    }
  }
  return { name: 'E', ok: false, attempt: 3, err: last };
}

async function main() {
  console.log(`[PROBE] node ${process.version}, playwright ${require('/www/apps/strapi/node_modules/playwright/package.json').version}, enddate=${ENDDATE}`);
  browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  console.log('[PROBE] browser launched');

  // 1. 策略 A（现状，预期复现）
  const A = await runStrategy('A', null);
  console.log(`[PROBE] A(domcontentloaded+立即evaluate): ${A.ok ? '成功' : '失败'} err=${A.err || ''} 耗时${(A.ms / 1000).toFixed(1)}s`);
  if (A.ok) console.log(`[PROBE]   A 详情: status=${A.status} list=${A.list ? A.list.length : '?'}`);

  // 2. 策略 B（networkidle）
  const B = await runStrategy('B', (page) => page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {}));
  console.log(`[PROBE] B(domcontentloaded+networkidle20s): ${B.ok ? '成功' : '失败'} err=${B.err || ''} 耗时${(B.ms / 1000).toFixed(1)}s`);
  if (B.ok) console.log(`[PROBE]   B 详情: status=${B.status} list=${B.list ? B.list.length : '?'}`);

  // 3. 策略 C（延时 3s）
  const C = await runStrategy('C', (page) => page.waitForTimeout(3000));
  console.log(`[PROBE] C(domcontentloaded+3s): ${C.ok ? '成功' : '失败'} err=${C.err || ''} 耗时${(C.ms / 1000).toFixed(1)}s`);
  if (C.ok) console.log(`[PROBE]   C 详情: status=${C.status} list=${C.list ? C.list.length : '?'}`);

  // 4. 策略 D（直接 goto JSON）
  const D = await strategyD();
  console.log(`[PROBE] D(goto JSON直读): ${D.ok ? '成功' : '失败'} err=${D.err || ''} status=${D.status} title=${D.title || ''} ct=${D.ct} 耗时${(D.ms / 1000).toFixed(1)}s`);
  if (D.ok) console.log(`[PROBE]   D 详情: list=${D.list ? D.list.length : '?'} keys=${JSON.stringify(D.keys)}`);

  // 5. 策略 E（A + 重试）
  const E = await strategyE();
  console.log(`[PROBE] E(A+重试3次): ${E.ok ? '成功' : '失败'} attempt=${E.attempt} err=${E.err || ''} 耗时${(E.ms / 1000).toFixed(1)}s`);
  if (E.ok) console.log(`[PROBE]   E 详情: status=${E.status} list=${E.list ? E.list.length : '?'}`);

  // 6. 对成功策略翻页拉全量
  const success = { A: A.ok ? A : null, B: B.ok ? B : null, C: C.ok ? C : null, D: D.ok ? D : null, E: E.ok ? E : null };
  for (const [key, res] of Object.entries(success)) {
    if (!res) continue;
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    try {
      let all;
      if (key === 'D') {
        // D 方式：逐页 goto JSON 读 innerText
        const rows = [];
        const perPage = [];
        for (let pno = 1; pno <= 20; pno++) {
          const url = `${BASE}/ningbo-web/product/funddaytable.json?code=${CODE}&startdate=${STARTDATE}&enddate=${ENDDATE}&request_num=100&request_pageno=${pno}`;
          const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });
          if (!resp || resp.status() !== 200) { all = { ok: false, err: `page${pno} status=${resp ? resp.status() : -1}`, got: rows.length }; break; }
          const body = await page.evaluate(() => document.body.innerText);
          const p = parseFundPage(body);
          if (!p.ok) { all = { ok: false, err: `page${pno} parse: ${p.err}`, got: rows.length }; break; }
          perPage.push(p.list.length);
          rows.push(...p.list);
          if (p.list.length === 0 || p.list.length < 100) break;
        }
        all = all || { ok: true, rows, perPage };
      } else {
        // 用该策略的等待方式 goto 详情页后 evaluate fetch 翻页
        const wait = key === 'B' ? (p) => p.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
          : key === 'C' ? (p) => p.waitForTimeout(3000)
          : null;
        await page.goto(DETAIL_URL, { waitUntil: 'domcontentloaded' });
        if (wait) await wait(page);
        all = await fetchAll(page, null);
      }
      if (!all.ok) {
        console.log(`[PROBE] ${key} 翻页全量: 失败 err=${all.err}`);
        continue;
      }
      const s = summarizeRows(all.rows);
      console.log(`[PROBE] ${key} 翻页全量: 成功 总条数=${s.total} 日期范围=${s.earliest} ~ ${s.latest} incomeratio有值=${s.incomeratioCount}/${s.total} 每页条数=[${all.perPage.join(',')}]`);
      for (const sm of s.sample) {
        console.log(`[PROBE]   ${key} 样本: ${JSON.stringify(sm)}`);
      }
    } catch (e) {
      console.log(`[PROBE] ${key} 翻页全量: 失败 err=${errShort(e)}`);
    } finally {
      await context.close().catch(() => {});
    }
  }

  // 7. list.json 产品信息（用成功策略的等待方式）
  const chosen = success.C || success.B || success.E || success.A || success.D;
  if (chosen) {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    try {
      let info;
      if (success.D) {
        const resp = await page.goto(LIST_URL, { waitUntil: 'domcontentloaded' });
        const body = await page.evaluate(() => document.body.innerText);
        info = { status: resp ? resp.status() : -1, text: body };
      } else {
        await page.goto(DETAIL_URL, { waitUntil: 'domcontentloaded' });
        const wait = chosen.name === 'B' ? (p) => p.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
          : chosen.name === 'C' ? (p) => p.waitForTimeout(3000) : null;
        if (wait) await wait(page);
        info = await pageFetch(page, LIST_URL);
      }
      let obj = null;
      try { obj = JSON.parse(info.text); } catch { obj = null; }
      if (obj) {
        const first = Array.isArray(obj) ? obj[0] : obj;
        const keys = Object.keys(first);
        const pick = {};
        for (const k of ['productName', 'registerCode', 'risklevelDesc', 'riskLevelDesc', 'risklevel', 'registerDate']) {
          if (first[k] !== undefined) pick[k] = first[k];
        }
        console.log(`[PROBE] list.json: status=${info.status} keys=${JSON.stringify(keys)} 字段=${JSON.stringify(pick)}`);
      } else {
        console.log(`[PROBE] list.json: 非JSON status=${info.status} 前100字符=${info.text.slice(0, 100)}`);
      }
    } catch (e) {
      console.log(`[PROBE] list.json: 失败 err=${errShort(e)}`);
    } finally {
      await context.close().catch(() => {});
    }
  }

  await browser.close().catch(() => {});
  console.log(`[PROBE] 总耗时 ${elapsed()} done`);
  process.exit(0);
}

main().catch((e) => {
  console.error('[PROBE] 致命错误:', errShort(e));
  process.exit(1);
});
