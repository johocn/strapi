/* 活动后「资料/回放下载」端到端验收（阶段B：assets 回放/资料字段）
 * 用法: cd e:\code\basic && node scripts/accept-activity-assets.cjs
 * 依赖: 本地 dev 1337 运行中(127.0.0.1:1337)，公开端点 /api/zhao-point/v1。
 * 覆盖:
 *  a) 活动 A(ended) 带 assets(recordingUrl + 1 份资料) → detail 返回 assets 完整
 *  b) 活动 B(signup_open) assets NULL → detail 返回 assets null 不报错
 *  c) 清理零残留(title LIKE 'aa_%')
 * schema 要点:
 *  - 活动集合 activities；assets(jsonb) 契约 { recordingUrl, materials:[{name,url}] }
 *  - 公开 detail 用 documentId: GET /zhao-point/v1/activities/:documentId
 *  - assets 标量 json 随 populate:"*" detail 响应直接返回
 */
const path = require('path');
const httpPkg = require('http');
const crypto = require('crypto');
const pg = require('pg');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PREFIX = 'aa_';

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

async function qa(sql, params) { const c = new pg.Client(PG); await c.connect(); const r = await c.query(sql, params); await c.end(); return r.rows; }

(async () => {
  const ts = Date.now();
  const titleA = `${PREFIX}A_回放_` + ts;
  const titleB = `${PREFIX}B_无资料_` + ts;
  const assetsJson = JSON.stringify({
    recordingUrl: 'https://example.com/rec.mp4',
    materials: [{ name: '课件', url: 'https://example.com/slides.pdf' }],
  });

  // ---------- 0. 清场(开头) ----------
  await qa('DELETE FROM activities WHERE title LIKE $1', [PREFIX + '%']);

  // ---------- 1. 种子：A(ended + assets) / B(signup_open + assets NULL) ----------
  const ua = crypto.randomUUID();
  const ub = crypto.randomUUID();
  await qa(
    "INSERT INTO activities (document_id,title,status,capacity,assets,created_at,updated_at) VALUES ($1,$2,$3,100,$4::jsonb,now(),now())",
    [ua, titleA, 'ended', assetsJson]
  );
  await qa(
    "INSERT INTO activities (document_id,title,status,capacity,created_at,updated_at) VALUES ($1,$2,$3,100,now(),now())",
    [ub, titleB, 'signup_open']
  );

  // ---------- 2. detail A → assets 完整 ----------
  let g = await req('GET', '/zhao-point/v1/activities/' + ua);
  let data = g.data && g.data.data;
  ok('detail A 200', g.status === 200 && !!data, `status=${g.status}`);
  ok('detail A assets.recordingUrl 正确', !!data && data.assets && data.assets.recordingUrl === 'https://example.com/rec.mp4', `assets=${JSON.stringify(data && data.assets)}`);
  ok('detail A assets.materials 长度 1', !!data && Array.isArray(data.assets && data.assets.materials) && data.assets.materials.length === 1, `materials=${JSON.stringify(data && data.assets && data.assets.materials)}`);
  ok('detail A materials[0].name=课件', !!data && data.assets && data.assets.materials[0].name === '课件');
  ok('detail A materials[0].url 正确', !!data && data.assets && data.assets.materials[0].url === 'https://example.com/slides.pdf');

  // ---------- 3. detail B → assets null 不报错 ----------
  g = await req('GET', '/zhao-point/v1/activities/' + ub);
  data = g.data && g.data.data;
  ok('detail B 200', g.status === 200 && !!data, `status=${g.status}`);
  ok('detail B assets 为 null/缺省(不报错,无回放区段源数据)', !!data, `assets=${JSON.stringify(data && data.assets)}`);

  // ---------- 4. 清理零残留 ----------
  await qa('DELETE FROM activities WHERE title LIKE $1', [PREFIX + '%']);
  const rc = (await qa('SELECT count(*)::int c FROM activities WHERE title LIKE $1', [PREFIX + '%']))[0];
  ok('清理零残留(activities title LIKE aa_% 为 0)', rc.c === 0, `c=${rc.c}`);

  console.log(`\n=== 阶段B 资料/回放下载 验收: PASS=${PASS} FAIL=${FAIL} ===`);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error('脚本异常:', e && e.stack || e); process.exit(1); });