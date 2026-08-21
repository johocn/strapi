/* 活动日历聚合视图 后端验收
 * 用法: cd e:\code\basic && node scripts/accept-calendar.cjs
 * 覆盖: admin 登录 -> 建带排期系列 + 该月已发布/草稿活动 -> C端按月(仅已发布) -> 管理端含草稿 ->
 *       惰性补齐(生成场次) + 幂等 -> 空月 -> 清理
 */
const { Client } = require('pg');

const BASE = 'http://127.0.0.1:1337/api';
const PG = {
  host: '127.0.0.1', port: 5432, database: 'strapi',
  user: 'postgres', password: 'admin',
};

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
  for (let i = 0; i < 20; i++) {
    try { r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); break; }
    catch (e) { if (i === 19) return { status: 0, json: { netErr: e.message } }; await sleep(400); }
  }
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

// 等待后端就绪：规避本地开发/重启造成的瞬断连接失败
async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    const r = await api('POST', '/zhao-auth/v1/login', { body: { identifier: '1117', password: 'a123456' } });
    if (r.status === 200 && r.json && (r.json.jwt || r.json.data)) return r.json;
    await sleep(800);
  }
  return null;
}

async function login(identifier, password) {
  const res = await api('POST', '/zhao-auth/v1/login', { body: { identifier, password } });
  return res.json;
}
const tokenOf = (j) =>
  (j && (j.jwt || j.access_token || j.token || (j.data && (j.data.jwt || j.data.token || j.data.access_token)))) || null;

async function dbCount(table, where) {
  const q = await client.query(`SELECT count(*)::int c FROM ${table} WHERE ${where}`);
  return q.rows[0].c;
}

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');

  // 清场（开头），含 join 表孤儿行
  await client.query(`DELETE FROM activities WHERE title LIKE '验收-%'`);
  await client.query(`DELETE FROM activity_series WHERE title LIKE '验收-%'`);
  await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_series_id NOT IN (SELECT id FROM activity_series) OR activity_id NOT IN (SELECT id FROM activities)`);

  // ---- 台架变量就绪 ----
  const checks = (name, cond, extra = '') => { if (cond) PASS++; else FAIL++; out.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`); };
  function pad(n) { return String(n).padStart(2, '0'); }
  function inMonthISO(m, day, hh = '10', mm = '00') { // 东八区某月某日 -> ISO
    const d = new Date(`${m}-${pad(day)}T${hh}:${mm}:00+08:00`);
    return d.toISOString();
  }

  // ---- 准备：建带排期的系列 + 该月已发布/草稿活动 ----
  const YM = new Date().toISOString().slice(0, 7); // 当前月，东八区可能跨日不影响 generate
  const adminLogin = await waitForServer() || (await login('1117', 'a123456'));
  const adminToken = tokenOf(adminLogin);
  checks('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 100));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  const series = (await api('POST', '/zhao-point/v1/admin/adm/series', { token: adminToken, body: { title: '验收-日历系列', status: 'active', schedule: { weekdays: [1, 3, 5], startTime: '10:00', durationMin: 60, generateWeeks: 8 } } })).json?.data;
  checks('创建日历系列', !!series?.documentId, `docId=${series && series.documentId}`);

  const pub = (await api('POST', '/zhao-point/v1/admin/adm/activities', { token: adminToken, body: { title: '验收-已发布活动', status: 'signup_open', startTime: inMonthISO(YM, 1), endTime: inMonthISO(YM, 1, 11), capacity: 10 } })).json?.data;
  const draft = (await api('POST', '/zhao-point/v1/admin/adm/activities', { token: adminToken, body: { title: '验收-草稿活动', status: 'draft', startTime: inMonthISO(YM, 2), endTime: inMonthISO(YM, 2, 11), capacity: 10 } })).json?.data;
  checks('创建已发布+草稿活动', !!pub?.documentId && !!draft?.documentId, `pub=${pub && pub.documentId} draft=${draft && draft.documentId}`);

  // ---- 惰性补齐计数（before 必须记录在首次浏览触发 generate 之前）----
  // 归属经 join 表 activities_belongs_to_series_lnk（非 belongs_to_series 列），计数走 join
  const seriesId = series && series.id;
  const countBySeries = async () => (await client.query(
    `SELECT count(*)::int c FROM activities a JOIN activities_belongs_to_series_lnk l ON l.activity_id=a.id WHERE l.activity_series_id=$1`, [seriesId])).rows[0].c;
  const before = await countBySeries(); // 建系列未 generate，此处应为 0（+可能残留）

  // ---- 断言 ----
  // 1) C 端：只含该月、只含 signup_open/ongoing、不含 draft（首次浏览：会触发系列惰性补齐）
  const pubCal = (await api('GET', '/zhao-point/v1/activities/calendar?month=' + YM)).json?.data;
  const pubDays = (pubCal?.days ?? []).flatMap((d) => d.activities);
  checks('C端按月返回', pubDays.every((a) => a.startTime && a.startTime.slice(0, 7) === YM), 'count=' + pubDays.length);
  checks('C端不含草稿', !pubDays.some((a) => a.status === 'draft') && pubDays.some((a) => a.title === '验收-已发布活动'));

  // 2) 管理端：含该月草稿
  const admCal = (await api('GET', '/zhao-point/v1/admin/adm/activities/calendar?month=' + YM, { token: adminToken })).json?.data;
  const admDays = (admCal?.days ?? []).flatMap((d) => d.activities);
  checks('管理端含草稿', admDays.some((a) => a.title === '验收-草稿活动'));

  // 3) 惰性补齐：浏览后系列生成草稿场次，且重复浏览不重复建（幂等）
  const after1 = await countBySeries();
  await api('GET', '/zhao-point/v1/activities/calendar?month=' + YM);
  const after2 = await countBySeries();
  checks('惰性补齐生成场次', after1 > before, `before=${before} after=${after1}`);
  checks('重复浏览幂等', after2 === after1, `${after1}->${after2}`);

  // 4) 空月
  const emptyCal = (await api('GET', '/zhao-point/v1/activities/calendar?month=2099-01')).json?.data;
  checks('空月返回空 days', Array.isArray(emptyCal?.days) && emptyCal.days.length === 0);

  // ---- 清理 ----
  if (pub && pub.documentId) await api('DELETE', `/zhao-point/v1/admin/adm/activities/${pub.documentId}`, { token: adminToken });
  if (draft && draft.documentId) await api('DELETE', `/zhao-point/v1/admin/adm/activities/${draft.documentId}`, { token: adminToken });
  if (series && series.documentId) await api('DELETE', `/zhao-point/v1/admin/adm/series/${series.documentId}`, { token: adminToken });
  // 再清残留 join
  await client.query(`DELETE FROM activities WHERE title LIKE '验收-%'`);
  await client.query(`DELETE FROM activity_series WHERE title LIKE '验收-%'`);
  await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_series_id NOT IN (SELECT id FROM activity_series) OR activity_id NOT IN (SELECT id FROM activities)`);
  const residue = await client.query(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE '验收-%') a,
      (SELECT count(*)::int FROM activity_series WHERE title LIKE '验收-%') s,
      (SELECT count(*)::int FROM activities_belongs_to_series_lnk WHERE activity_series_id NOT IN (SELECT id FROM activity_series) OR activity_id NOT IN (SELECT id FROM activities)) l`);
  const res = residue.rows[0];
  checks(`清理完成(残留 a=${res.a},s=${res.s},lnk孤儿=${res.l})`, res.a === 0 && res.s === 0 && res.l === 0, `a=${res.a} s=${res.s} l=${res.l}`);

  await client.end();

  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });