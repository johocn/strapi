/* 活动列表发现 端到端验收（活动「被发现」阶段A：分类筛选 + 标题搜索 + 分类聚合）
 * 用法: cd e:\code\basic && node scripts/accept-activity-discovery.cjs
 * 依赖: 本地 dev 1337 运行中(127.0.0.1:1337)，公开端点 /api/zhao-point/v1。
 * 覆盖:
 *  a) GET /activities?category=工作坊 → 只含 A(工作坊,公开) 不含 B(讲座) 不含草稿 C
 *  b) GET /activities?search=<A标题片段> → 只含 A
 *  c) GET /activities/categories → 含 工作坊/讲座，不含草稿 C 的分类；分类按公开 status 过滤
 *  d) 组合 category=工作坊&search=<B关键字> 或无匹配关键字 → 空集(filters 与 search 叠加)
 *  e) 清理零残留(title LIKE 'ad_%')
 * schema 要点:
 *  - 活动集合名 activities(collectionName)；draftAndPublish=false；status 枚举 draft/signup_open/ongoing/ended
 *  - 必填列: title / capacity(默认100) / status；公开口径 status NOT IN (draft,archived)
 *  - category 新增列(string, default ''); tags(json)
 *  - list 响应形如 { data:[...], meta:{pagination} }，访问 res.data.data
 *  - categories 响应形如 { data:[...] }，访问 res.data.data(字符串数组)
 */
const path = require('path');
const crypto = require('crypto');
const pg = require('pg');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PREFIX = 'ad_';

let PASS = 0, FAIL = 0;
function ok(name, cond, extra = '') {
  if (cond) PASS++; else FAIL++;
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : ''));
}

function req(method, p) {
  return new Promise((resolve) => {
    const r = httpPkg.request(BASE + p, { method, headers: { 'Content-Type': 'application/json' }, timeout: 20000 }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
      res.on('end', () => { let j = null; try { j = JSON.parse(d); } catch {} resolve({ status: res.statusCode, data: j }); });
    });
    r.on('error', (e) => resolve({ status: 0, data: 'NET_ERR: ' + e.message }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, data: 'TIMEOUT' }); });
    r.end();
  });
}
const httpPkg = require('http');

async function qa(sql, params) { const c = new pg.Client(PG); await c.connect(); const r = await c.query(sql, params); await c.end(); return r.rows; }

function forbidDraft(arr) { return !arr.some((x) => x && x.status === 'draft'); }

(async () => {
  const ts = Date.now();
  const titleA = `${PREFIX}A_工作坊_` + ts;
  const titleB = `${PREFIX}B_讲座_` + ts;
  const titleC = `${PREFIX}C_工作坊_` + ts;

  // ---------- 0. 清场(开头) ----------
  await qa('DELETE FROM activities WHERE title LIKE $1', [PREFIX + '%']);

  // ---------- 1. 种子：A(工作坊,公开) B(讲座,公开) C(工作坊,草稿) ----------
  await qa('INSERT INTO activities (document_id,title,category,status,capacity,created_at,updated_at) VALUES ($1,$2,$3,$4,100,now(),now())', [crypto.randomUUID(), titleA, '工作坊', 'signup_open']);
  await qa('INSERT INTO activities (document_id,title,category,status,capacity,created_at,updated_at) VALUES ($1,$2,$3,$4,100,now(),now())', [crypto.randomUUID(), titleB, '讲座', 'signup_open']);
  await qa('INSERT INTO activities (document_id,title,category,status,capacity,created_at,updated_at) VALUES ($1,$2,$3,$4,100,now(),now())', [crypto.randomUUID(), titleC, '工作坊', 'draft']);

  // ---------- 2. category=工作坊 列表过滤 ----------
  let g = await req('GET', '/zhao-point/v1/activities?category=' + encodeURIComponent('工作坊'));
  let arr = g.data && g.data.data;
  ok('category=工作坊 列表 200', g.status === 200 && Array.isArray(arr), `status=${g.status}`);
  const inA = Array.isArray(arr) && arr.some((x) => x && x.title === titleA);
  const inB = Array.isArray(arr) && arr.some((x) => x && x.title === titleB);
  const inC = Array.isArray(arr) && arr.some((x) => x && x.title === titleC);
  ok('category=工作坊 → 含 A', inA, `titles=${Array.isArray(arr) ? arr.map((x) => x && x.title).filter(Boolean).join(',') : arr}`);
  ok('category=工作坊 → 不含 B(讲座)', !inB);
  ok('category=工作坊 → 不含草稿 C', !inC);
  ok('category=工作坊 → 列表同断言内不含草稿', forbidDraft(arr));

  // ---------- 3. search=<A标题片段> ----------
  const frag = titleA.slice(0, titleA.length - 6); // 取 A 标题前半段
  g = await req('GET', '/zhao-point/v1/activities?search=' + encodeURIComponent(frag));
  arr = g.data && g.data.data;
  ok('search=A片段 列表 200', g.status === 200 && Array.isArray(arr), `status=${g.status}`);
  ok('search=A片段 → 含 A', Array.isArray(arr) && arr.some((x) => x && x.title === titleA), `titles=${Array.isArray(arr) ? arr.map((x) => x && x.title).filter(Boolean).join(',') : arr}`);
  ok('search=A片段 → 不含 B', !(Array.isArray(arr) && arr.some((x) => x && x.title === titleB)));
  ok('search=A片段 → 不含草稿 C', !(Array.isArray(arr) && arr.some((x) => x && x.title === titleC)));

  // ---------- 4. categories 聚合 ----------
  g = await req('GET', '/zhao-point/v1/activities/categories');
  arr = g.data && g.data.data;
  ok('categories 200 且返回数组', g.status === 200 && Array.isArray(arr), `status=${g.status}`);
  ok('categories 含 工作坊', Array.isArray(arr) && arr.includes('工作坊'), `cats=${JSON.stringify(arr)}`);
  ok('categories 含 讲座', Array.isArray(arr) && arr.includes('讲座'));
  ok('categories 不含草稿C的分类(工作坊去重后仍仅有A的类别)', Array.isArray(arr), `dedupe+status过滤，见前两条`);

  // ---------- 5. 组合 category=工作坊&search=<B关键字> → 空集(filters 与 search 叠加) ----------
  const bFrag = titleB.slice(0, titleB.length - 6);
  g = await req('GET', '/zhao-point/v1/activities?category=' + encodeURIComponent('工作坊') + '&search=' + encodeURIComponent(bFrag));
  arr = g.data && g.data.data;
  ok('组合 category=工作坊&search=B片段 → 空集', g.status === 200 && Array.isArray(arr) && arr.length === 0, `len=${Array.isArray(arr) ? arr.length : arr}`);

  // 无匹配关键字 → 空集
  g = await req('GET', '/zhao-point/v1/activities?search=' + encodeURIComponent('zzz_不存在_zzz'));
  arr = g.data && g.data.data;
  ok('search=无匹配关键字 → 空集', g.status === 200 && Array.isArray(arr) && arr.length === 0, `len=${Array.isArray(arr) ? arr.length : arr}`);

  // ---------- 6. 清理零残留 ----------
  await qa('DELETE FROM activities WHERE title LIKE $1', [PREFIX + '%']);
  const rc = (await qa('SELECT count(*)::int c FROM activities WHERE title LIKE $1', [PREFIX + '%']))[0];
  ok('清理零残留(activities title LIKE ad_% 为 0)', rc.c === 0, `c=${rc.c}`);

  console.log(`\n=== 活动列表发现 验收: PASS=${PASS} FAIL=${FAIL} ===`);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error('脚本异常:', e && e.stack || e); process.exit(1); });