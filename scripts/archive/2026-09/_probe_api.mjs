// 宁银理财 funddaytable.json 接口行为探测（原生 fetch，无浏览器）
'use strict';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/www/apps/strapi/node_modules/playwright');
const BASE = 'https://www.wmbnb.com';
const CODE = 'ZGN2660096E';
const today = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const ENDDATE = today();

const fundUrl = (pno, num) =>
  `${BASE}/ningbo-web/product/funddaytable.json?code=${CODE}&startdate=2020-01-01&enddate=${ENDDATE}&request_num=${num}&request_pageno=${pno}`;

const fmtDate = (ms) => {
  const d = new Date(Number(ms));
  return isNaN(d.getTime()) ? String(ms) : d.toISOString().slice(0, 10);
};

async function get(url) {
  const r = await api.get(url);
  const text = await r.text();
  let j = null;
  let parseErr = null;
  try { j = JSON.parse(text); } catch (e) { parseErr = e.message; }
  return { status: r.status(), ct: r.headers()['content-type'] || '', j, parseErr, rawLen: text.length, textHead: text.slice(0, 150) };
}

function brief(label, o) {
  if (!o.j) { console.log(`[API] ${label}: status=${o.status} ct=${o.ct} 非JSON(${o.parseErr}) head=${JSON.stringify(o.textHead)}`); return; }
  const j = o.j;
  const list = Array.isArray(j.list) ? j.list : [];
  const first = list[0] || {};
  const last = list[list.length - 1] || {};
  console.log(`[API] ${label}: status=${o.status} total字段=${j.total} msg=${j.msg} list=${list.length} 首=${list.length ? fmtDate(first.cdate) : '-'} 末=${list.length ? fmtDate(last.cdate) : '-'} keys=${Object.keys(j).join(',')}`);
}

let api = null;

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  });
  api = context.request;
  console.log(`[API] enddate=${ENDDATE}`);
  // 1. 翻页 1..6，request_num=100
  for (let pno = 1; pno <= 6; pno++) {
    const o = await get(fundUrl(pno, 100));
    brief(`pageno=${pno} num=100`, o);
  }
  console.log('---');
  // 2. request_num 变化（pageno=1）
  for (const num of [15, 20, 50, 100, 500, 1000]) {
    const o = await get(fundUrl(1, num));
    brief(`pageno=1 num=${num}`, o);
  }
  console.log('---');
  // 3. startdate 参数是否生效（num=100, pageno=1）
  for (const sd of ['2026-08-01', '2026-07-01', '2026-01-01', '2020-01-01']) {
    const url = `${BASE}/ningbo-web/product/funddaytable.json?code=${CODE}&startdate=${sd}&enddate=${ENDDATE}&request_num=100&request_pageno=1`;
    brief(`startdate=${sd}`, await get(url));
  }
  console.log('---');
  // 4. 无 startdate / 无 enddate
  brief('无startdate', await get(`${BASE}/ningbo-web/product/funddaytable.json?code=${CODE}&request_num=100&request_pageno=1`));
  brief('无参数仅code', await get(`${BASE}/ningbo-web/product/funddaytable.json?code=${CODE}`));
  console.log('---');
  // 5. 大 num 下翻页（如果 num=500 生效，看 pageno=2 是否还有数据）
  for (const pno of [1, 2, 3]) {
    const o = await get(fundUrl(pno, 500));
    brief(`pageno=${pno} num=500`, o);
  }
  console.log('---');
  // 6. list.json 完整结构（list[0] 字段）
  const lr = await get(`${BASE}/ningbo-web/product/list.json?projectcode=${CODE}`);
  if (lr.j) {
    const arr = Array.isArray(lr.j.list) ? lr.j.list : [];
    console.log(`[API] list.json status=${lr.status} total=${lr.j.total} listLen=${arr.length} list[0]keys=${arr[0] ? Object.keys(arr[0]).join(',') : '-'}`);
    if (arr[0]) console.log(`[API] list[0] 完整: ${JSON.stringify(arr[0]).slice(0, 500)}`);
  } else {
    console.log(`[API] list.json 非JSON status=${lr.status} head=${JSON.stringify(lr.textHead)}`);
  }
  await browser.close().catch(() => {});
}

main().catch((e) => { console.error('[API] 致命错误:', e.message); process.exit(1); });
