/* 评价看板·评分趋势+文本关键词 验收
 * 用法: cd e:\code\basic && node scripts/accept-review-trend.cjs
 * 覆盖:
 *  1. summary.trend: 按 ISO 周聚合, 返回最近12周升序(空周补0), 有数据周的 count/avgRating/avgNps 正确
 *  2. summary.keywords: 轻量词频(连续中文/英文词切分+停用词过滤), 频次降序, 停用词被过滤
 *  3. summary.count/avgRating/avgNps 在原口径上保持(回归)
 *  4. 零残留
 * 运行前置: 本地 Strapi develop(127.0.0.1:1337) 已运行且 zhao-point 已重编译
 */
const { Client } = require('pg');
const crypto = require('crypto');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'rt7_'; // 测试用户名前缀

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
async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    const r = await api('POST', '/zhao-auth/v1/login', { body: { identifier: '1117', password: 'a123456' } });
    if (r.status === 200 && r.json?.jwt) return r.json;
    await sleep(800);
  }
  return null;
}
const tokenOf = (j) =>
  (j && (j.jwt || j.access_token || j.token || (j.data && (j.data.jwt || j.data.token || j.data.access_token)))) || null;
async function register(username) {
  const res = await api('POST', '/zhao-auth/v1/register', {
    body: { username, email: `${username}@audit.local`, password: 'a123456', confirmPassword: 'a123456' },
  });
  const j = res.json || {};
  const user = j.user || j.data?.user || j.data || j;
  return { id: user?.id || user?.documentId, raw: j };
}
const q = async (sql, params) => (await client.query(sql, params)).rows;

// 本周周一(与后端 ISO 周一算法一致的简化): 今天 - ((getDay()+6)%7)
function baseMonday() {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return d;
}
function fmt(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');
  const ts = Date.now();
  const RND = Math.floor(Math.random() * 1e6);
  const nm = (s) => `${PF}${s}_${ts}_${RND}`;

  // ---- 清场(开头) ----
  const acts = await q(`SELECT id FROM activities WHERE title LIKE '验收-%'`);
  for (const a of acts) {
    const ss = await q(`SELECT activity_signup_id::int AS id FROM activity_signups_activity_lnk WHERE activity_id = $1`, [a.id]);
    for (const s of ss) {
      await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id = $1`, [s.id]);
      await client.query(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [s.id]);
      await client.query(`DELETE FROM activity_signups WHERE id = $1`, [s.id]);
    }
    await client.query(`DELETE FROM activities WHERE id = $1`, [a.id]);
  }
  const upRows = await q(`SELECT id FROM up_users WHERE username LIKE '${PF}%'`);
  for (const u of upRows) {
    const recIds = await q(`SELECT point_record_id::int AS id FROM zhao_point_records_user_lnk WHERE user_id = $1`, [u.id]);
    for (const r of recIds) {
      await client.query(`DELETE FROM zhao_point_records_user_lnk WHERE point_record_id = $1`, [r.id]);
      await client.query(`DELETE FROM zhao_point_records_user_channel_lnk WHERE point_record_id = $1`, [r.id]);
      await client.query(`DELETE FROM zhao_point_records WHERE id = $1`, [r.id]);
    }
    await client.query(`DELETE FROM up_users WHERE id = $1`, [u.id]);
  }

  // ---- admin 登录 ----
  const adminLogin = await waitForServer();
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 80));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  // ---- 测试用户 ----
  const users = {};
  for (const k of ['u1', 'u2', 'u3', 'u4', 'u5']) {
    const u = await register(nm(k));
    users[k] = { id: u.id };
    check(`注册测试用户 ${k}`, !!u.id, `id=${u.id}`);
  }

  // ---- 构造 1 个活动 ----
  const actRes = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: {
      title: '验收-评价趋势', description: '评价', capacity: 100, status: 'ended',
      startTime: new Date(Date.now() - 86400e3).toISOString(),
      endTime: new Date(Date.now() + 86400e3).toISOString(),
    },
  });
  const act = actRes.json && actRes.json.data;
  check('建活动成功', actRes.status === 200 && !!act && !!act.id && !!act.documentId, JSON.stringify(act));
  if (!act) { console.error('建活动失败，终止'); process.exit(1); }

  // ---- 直插报名(评价分布 3 周) ----
  // reviewerAt 落在: W0=本周一, W-1=上周一, W-3=上上上周一
  const W = baseMonday();
  const w0 = new Date(W); const w1 = new Date(W.getTime() - 7 * 86400e3); const w3 = new Date(W.getTime() - 21 * 86400e3);
  const insSignup = async (uid, { rating = null, nps = null, review = null, at = null } = {}) => {
    const sig = await client.query(
      `INSERT INTO activity_signups (document_id,status,points_charged,signup_at,attended_at,rating,nps,review,reviewed_at,created_at,updated_at)
       VALUES ($1,'ended',0,now(),now(),$2,$3,$4,$5,now(),now()) RETURNING id`,
      [crypto.randomUUID(), rating, nps, review, at]);
    await client.query(`INSERT INTO activity_signups_activity_lnk (activity_signup_id,activity_id) VALUES ($1,$2)`, [sig.rows[0].id, act.id]);
    await client.query(`INSERT INTO activity_signups_user_lnk (activity_signup_id,user_id) VALUES ($1,$2)`, [sig.rows[0].id, uid]);
    return sig.rows[0].id;
  };
  // W0: u1(r5 n9 '讲师专业 课程实用'), u2(r4 n8 '讲师耐心 氛围不错')
  await insSignup(users.u1.id, { rating: 5, nps: 9, review: '讲师专业 课程实用', at: w0.toISOString() });
  await insSignup(users.u2.id, { rating: 4, nps: 8, review: '讲师耐心 氛围不错', at: new Date(w0.getTime() + 86400e3).toISOString() });
  // W-1: u3(r5 n9 '讲师专业 值得再来')
  await insSignup(users.u3.id, { rating: 5, nps: 9, review: '讲师专业 值得再来', at: w1.toISOString() });
  // W-3: u4(r3 n7 '体验一般 有待提升'), u5(仅文字 review, 含停用词 '这个 真的 感觉 不错')
  await insSignup(users.u4.id, { rating: 3, nps: 7, review: '体验一般 有待提升', at: w3.toISOString() });
  await insSignup(users.u5.id, { review: '这个 真的 感觉 不错', at: new Date(w3.getTime() + 86400e3).toISOString() });

  // ---- 调用评价看板(限定本活动) ----
  const res = await api('GET', `/zhao-point/v1/admin/adm/activity-reviews?activityDId=${act.documentId}`, { token: adminToken });
  const d = res.json;
  check('activity-reviews 端点 200 且返回 rows/summary', res.status === 200 && Array.isArray(d.rows) && !!d.summary, `${res.status} ${JSON.stringify(res.json).slice(0, 100)}`);
  if (!d?.summary) { console.error('无 summary，终止'); process.exit(1); }
  const s = d.summary;

  // ---- 回归: 原口径 ----
  // count=5 条评价记录(u1..u5, u5 仅文字); avgRating=(5+4+5+3)/4=4.25; avgNps=(9+8+9+7)/4=8.25
  check('summary.count=5', s.count === 5, `v=${s.count}`);
  check('summary.avgRating=4.25', s.avgRating === 4.25, `v=${s.avgRating}`);
  check('summary.avgNps=8.25', s.avgNps === 8.25, `v=${s.avgNps}`);

  // ---- trend 断言 ----
  check('summary.trend 是数组且长度=12(最近12周含空周)', Array.isArray(s.trend) && s.trend.length === 12, `len=${Array.isArray(s.trend) ? s.trend.length : 'N/A'}`);
  const trendAsc = s.trend.every((x, i) => i === 0 || x.weekLabel > s.trend[i - 1].weekLabel);
  check('trend 按周升序', trendAsc, '');
  const f0 = s.trend.find((x) => x.weekLabel === fmt(w0));
  const f1 = s.trend.find((x) => x.weekLabel === fmt(w1));
  const f3 = s.trend.find((x) => x.weekLabel === fmt(w3));
  check('W0 有数据周: count=2 avgRating=4.5 avgNps=8.5', f0 && f0.count === 2 && f0.avgRating === 4.5 && f0.avgNps === 8.5, JSON.stringify(f0));
  check('W-1 有数据周: count=1 avgRating=5 avgNps=9', f1 && f1.count === 1 && f1.avgRating === 5 && f1.avgNps === 9, JSON.stringify(f1));
  check('W-3 有数据周: count=2(含仅文字) avgRating=3 avgNps=7', f3 && f3.count === 2 && f3.avgRating === 3 && f3.avgNps === 7, JSON.stringify(f3));
  const emptyWeeks = s.trend.filter((x) => !f0 || !f1 || !f3 || (x.weekLabel !== fmt(w0) && x.weekLabel !== fmt(w1) && x.weekLabel !== fmt(w3)));
  check('空周 count=0 且 avgRating/avgNps 为 null', emptyWeeks.every((x) => x.count === 0 && x.avgRating === null && x.avgNps === null), JSON.stringify(emptyWeeks.slice(0, 3)));

  // ---- keywords 断言 ----
  check('summary.keywords 是数组且非空', Array.isArray(s.keywords) && s.keywords.length > 0, JSON.stringify(s.keywords));
  check('keywords 频次降序', s.keywords.every((x, i) => i === 0 || s.keywords[i - 1].value >= x.value), JSON.stringify(s.keywords));
  const top = s.keywords[0];
  check("keywords Top1='讲师专业' 频次=2", top && top.text === '讲师专业' && top.value === 2, JSON.stringify(top));
  check('停用词被过滤(不含 这个/真的/感觉)', !s.keywords.some((k) => ['这个', '真的', '感觉'].includes(k.text)), JSON.stringify(s.keywords));
  check(`关键词含 '不错'(来自 u5 文字)`, s.keywords.some((k) => k.text === '不错'), JSON.stringify(s.keywords));

  // ---- 清理(零残留) ----
  const ss = await q(`SELECT activity_signup_id::int AS id FROM activity_signups_activity_lnk WHERE activity_id = $1`, [act.id]);
  for (const s0 of ss) {
    await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id = $1`, [s0.id]);
    await client.query(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [s0.id]);
    await client.query(`DELETE FROM activity_signups WHERE id = $1`, [s0.id]);
  }
  await client.query(`DELETE FROM activities WHERE id = $1`, [act.id]);
  const upIds = await q(`SELECT id FROM up_users WHERE username LIKE '${PF}%'`);
  for (const u of upIds) {
    const recIds = await q(`SELECT point_record_id::int AS id FROM zhao_point_records_user_lnk WHERE user_id = $1`, [u.id]);
    for (const r of recIds) {
      await client.query(`DELETE FROM zhao_point_records_user_lnk WHERE point_record_id = $1`, [r.id]);
      await client.query(`DELETE FROM zhao_point_records_user_channel_lnk WHERE point_record_id = $1`, [r.id]);
      await client.query(`DELETE FROM zhao_point_records WHERE id = $1`, [r.id]);
    }
    await client.query(`DELETE FROM up_users WHERE id = $1`, [u.id]);
  }
  const residue = await q(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE '验收-%') a,
      (SELECT count(*)::int FROM activity_signups_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) su,
      (SELECT count(*)::int FROM up_users WHERE username LIKE '${PF}%') u,
      (SELECT count(*)::int FROM zhao_point_records_user_lnk ul JOIN up_users uu ON uu.id = ul.user_id WHERE uu.username LIKE '${PF}%') pl`);
  const resr = residue[0];
  check(`清理完成(活动=${resr.a} 报名孤儿=${resr.su} 测试用户=${resr.u} 点记录=${resr.pl})`,
    resr.a === 0 && resr.su === 0 && resr.u === 0 && resr.pl === 0);

  await client.end();
  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });