/* 线下活动报名时间联动 验收
 * 用法: cd e:\code\basic && node scripts/accept-activity-signup-time.cjs
 * 覆盖(对齐实施计划):
 *  1. adminCreate 校验：signupEnd<=signupStart → 400；endTime<=startTime → 400
 *  2. adminCreate 正常：signupAdvanceHours 字段落库可读回
 *  3. adminUpdate 校验：signupEnd<=signupStart → 400（含 existing 兜底）
 *  4. adminUpdate 正常：改 signupAdvanceHours → 200 存库
 *  5. 负提前量（报名截止晚于活动开始）允许存储
 *  6. 零残留：创建的活动与测试用户全部清理
 * 运行前置: 本地 Strapi develop(127.0.0.1:1337)已运行且 zhao-point 已重编译
 */
const { Client } = require('pg');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'ast_'; // 测试用户名前缀

let PASS = 0, FAIL = 0;
const out = [];
const check = (name, cond, detail = '') => {
  if (cond) PASS++; else FAIL++;
  out.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let client;

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let r;
  for (let i = 0; i < 25; i++) {
    try { r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); break; }
    catch (e) { if (i === 24) return { status: 0, json: { netErr: e.message } }; await sleep(600); }
  }
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}
async function waitForAdmin() {
  for (let i = 0; i < 30; i++) {
    const r = await api('POST', '/zhao-auth/v1/login', { body: { identifier: '1117', password: 'a123456' } });
    if (r.status === 200 && r.json?.jwt) return r.json;
    await sleep(800);
  }
  return null;
}
const tokenOf = (j) =>
  (j && (j.jwt || j.access_token || j.token || (j.data && (j.data.jwt || j.data.token || j.data.access_token)))) || null;
const q = async (sql, params) => (await client.query(sql, params)).rows;

const day = (offsetMin) => {
  const d = new Date(Date.now() + offsetMin * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

async function main() {
  client = new Client(PG);
  await client.connect();

  // 清理上次残留
  await client.query(`DELETE FROM up_users WHERE username LIKE $1`, [`${PF}%`]);
  await client.query(`DELETE FROM activities WHERE title LIKE $1`, ['验收-报名时间-%']);

  const admin = await waitForAdmin();
  const adminToken = tokenOf(admin);
  check('admin 登录', !!adminToken);

  // 1. adminCreate: signupEnd <= signupStart → 400
  let r = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: { title: '验收-报名时间-1', capacity: 10, signupStart: day(120), signupEnd: day(60), status: 'draft' },
  });
  check('create signupEnd<=signupStart 拒绝', r.status === 400, `status=${r.status} ${JSON.stringify(r.json)}`);

  // 2. adminCreate: endTime <= startTime → 400
  r = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: { title: '验收-报名时间-2', capacity: 10, startTime: day(120), endTime: day(60), status: 'draft' },
  });
  check('create endTime<=startTime 拒绝', r.status === 400, `status=${r.status} ${JSON.stringify(r.json)}`);

  // 3. adminCreate: 正常 + signupAdvanceHours 落库
  r = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: {
      title: '验收-报名时间-3', capacity: 10,
      startTime: day(480), endTime: day(540),
      signupStart: day(-60), signupEnd: day(480 - 120), signupAdvanceHours: 120, status: 'draft',
    },
  });
  const act3 = r.json?.data || r.json;
  check('create 正常', r.status === 200, `status=${r.status} ${JSON.stringify(r.json)}`);
  const docId3 = act3?.documentId;
  check('create signupAdvanceHours 落库', act3?.signupAdvanceHours === 120, `got=${act3?.signupAdvanceHours}`);

  // 4. adminUpdate: signupEnd<=signupStart → 400（existing 兜底）
  r = await api('PUT', `/zhao-point/v1/admin/adm/activities/${docId3}`, {
    token: adminToken,
    body: { signupEnd: day(60), signupStart: day(120) },
  });
  check('update signupEnd<=signupStart 拒绝', r.status === 400, `status=${r.status} ${JSON.stringify(r.json)}`);

  // 5. adminUpdate: 正常改 signupAdvanceHours → 存库
  r = await api('PUT', `/zhao-point/v1/admin/adm/activities/${docId3}`, {
    token: adminToken,
    body: { signupAdvanceHours: 96 },
  });
  const act5 = r.json?.data || r.json;
  check('update signupAdvanceHours 存库', r.status === 200 && act5?.signupAdvanceHours === 96, `got=${act5?.signupAdvanceHours}`);

  // 5b. adminUpdate: 负提前量（报名截止晚于活动开始）→ 允许存储
  r = await api('PUT', `/zhao-point/v1/admin/adm/activities/${docId3}`, {
    token: adminToken,
    body: { signupAdvanceHours: -2 },
  });
  const act5b = r.json?.data || r.json;
  check('update signupAdvanceHours 负值可存', r.status === 200 && act5b?.signupAdvanceHours === -2, `got=${act5b?.signupAdvanceHours}`);

  // 6. 零残留
  if (docId3) await api('DELETE', `/zhao-point/v1/admin/adm/activities/${docId3}`, { token: adminToken });
  await client.query(`DELETE FROM activities WHERE title LIKE $1`, ['验收-报名时间-%']);
  const left = await q(`SELECT count(*)::int AS c FROM activities WHERE title LIKE $1`, ['验收-报名时间-%']);
  check('活动零残留', left[0].c === 0, `left=${left[0].c}`);

  console.log(out.join('\n'));
  console.log(`\n结果: PASS ${PASS} / FAIL ${FAIL}`);
  await client.end();
  process.exit(FAIL ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
