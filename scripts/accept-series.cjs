/* 活动系列(series) + 排期管理 后端验收
 * 用法: cd e:\code\basic && node scripts/accept-series.cjs
 * 覆盖: admin 登录 -> 建系列 -> 列表 -> 改标题 -> 建2场活动归系列 -> duplicate ->
 *       排期 -> 手工 generate 幂等/查重 -> DB draft 场次 -> 普通用户越权 -> 公开接口 -> 清理
 *
 * 已知实现事实(脚本已适配, 见各 check detail):
 *  - 所有 controller 返回 { data: ... }(wrap/wrapList)。
 *  - 系列/活动关系存 join 表 activities_belongs_to_series_lnk(非 belongs_to_series 列);
 *    belongsToSeries 归属经 /adm/activities(populate *) 读回对象{id,documentId} 校验。
 *  - generateSchedule 具备时槽查重(不在同一 start_time 重复建), 但 count=3 语义是
 *    "滚动补齐未来 N 场"——重复调用会往下周继续生成, 不会返回 0。故幂等以
 *    "无同(series,start_time) 重复场次" 断言(真实查重保证), 打印 g1/g2 实际值。
 *  - POST /adm/activities/:docId/duplicate 当前后端实现抛 400 "Invalid key select at
 *    preUnlockArticles"(duplicate 服务 findOne 的 populate select 语法被拒), 与入参无关,
 *    属后端缺陷; 脚本如实记录 FAIL 并打印错误(不伪造通过)。
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

// belongsToSeries 指向系列：对象{documentId|id} / 数字 兼容
const belongsTo = (s, seriesDocId, seriesId) =>
  !!s && (s.documentId === seriesDocId || (s.id != null && s.id === seriesId) || s === seriesId || s === seriesDocId);

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');

  // 清场（开头），含 join 表孤儿行
  await client.query(`DELETE FROM activities WHERE title LIKE '验收-%'`);
  await client.query(`DELETE FROM activity_series WHERE title LIKE '验收-%'`);
  await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_series_id NOT IN (SELECT id FROM activity_series) OR activity_id NOT IN (SELECT id FROM activities)`);

  // 1) admin 登录
  const adminLogin = await waitForServer() || (await login('1117', 'a123456'));
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 100));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  // 2) 建系列
  let r = await api('POST', '/zhao-point/v1/admin/adm/series', {
    token: adminToken,
    body: { title: '验收-系列A', description: '验收用系列', status: 'active' },
  });
  const series = r.json && r.json.data;
  const seriesDocId = series && series.documentId;
  const seriesId = series && series.id;
  check('建系列成功并返回 documentId', r.status === 200 && !!seriesDocId, `${r.status} docId=${seriesDocId} id=${seriesId}`);

  // 3) 列表含该系列
  r = await api('GET', '/zhao-point/v1/admin/adm/series', { token: adminToken });
  const sList = (r.json && r.json.data) || [];
  check('admin 系列列表含该系列', r.status === 200 && sList.some((s) => s.documentId === seriesDocId), `${r.status} 数量=${sList.length}`);

  // 4) 改标题
  const newTitle = '验收-系列A-已更新';
  r = await api('PUT', `/zhao-point/v1/admin/adm/series/${seriesDocId}`, { token: adminToken, body: { title: newTitle } });
  const upd = r.json && r.json.data;
  check('PUT 改标题成功', r.status === 200 && !!upd && upd.title === newTitle, `${r.status} title=${upd && upd.title}`);
  r = await api('GET', '/zhao-point/v1/admin/adm/series', { token: adminToken });
  const sList2 = (r.json && r.json.data) || [];
  const myself = sList2.find((s) => s.documentId === seriesDocId);
  check('回读标题已变化', !!myself && myself.title === newTitle, `title=${myself && myself.title}`);

  // 5) 建两场活动归该系列
  let a1, a2;
  r = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: { title: '验收-场次1', description: '场次一', capacity: 50, status: 'signup_open', belongsToSeries: seriesDocId },
  });
  a1 = r.json && r.json.data;
  check('建场次1成功', r.status === 200 && a1 && a1.documentId, `${r.status} docId=${a1 && a1.documentId}`);

  r = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: { title: '验收-场次2', description: '场次二', capacity: 50, status: 'signup_open', belongsToSeries: seriesDocId },
  });
  a2 = r.json && r.json.data;
  check('建场次2成功', r.status === 200 && a2 && a2.documentId, `${r.status} docId=${a2 && a2.documentId}`);

  // 归属校验：经 /adm/activities(populate *) 读回 belongsToSeries 对象
  r = await api('GET', '/zhao-point/v1/admin/adm/activities?pageSize=100', { token: adminToken });
  const allActivities = (r.json && r.json.data) || [];
  const f1 = allActivities.find((a) => a.documentId === (a1 && a1.documentId));
  const f2 = allActivities.find((a) => a.documentId === (a2 && a2.documentId));
  check('场次1 belongsToSeries 指向系列', !!f1 && belongsTo(f1.belongsToSeries, seriesDocId, seriesId), `belongsTo=${f1 && JSON.stringify(f1.belongsToSeries || f1.belongsToSeries)}`);
  check('场次2 belongsToSeries 指向系列', !!f2 && belongsTo(f2.belongsToSeries, seriesDocId, seriesId), `belongsTo=${f2 && JSON.stringify(f2.belongsToSeries)}`);

  // 6) duplicate（后端当前缺陷会 400，如实记录）
  if (a1 && a1.documentId) {
    r = await api('POST', `/zhao-point/v1/admin/adm/activities/${a1.documentId}/duplicate`, { token: adminToken });
    const dup = r.json && r.json.data;
    const dupOk = r.status === 200 && !!dup && dup.documentId;
    const errMsg = (r.json && (r.json.error || JSON.stringify(r.json))) || '';
    check('duplicate: 新建副本成功并返回 documentId', dupOk, `${r.status} ${dup && dup.documentId} ${errMsg}`);
    if (dupOk) {
      check('副本 title 含「（副本）」', typeof dup.title === 'string' && dup.title.includes('（副本）'), `title=${dup.title}`);
      check('副本 status=draft', dup.status === 'draft', `status=${dup.status}`);
      check('副本 usedCapacity=0', dup.usedCapacity === 0, `usedCapacity=${dup.usedCapacity}`);
      check('副本 belongsToSeries 指向系列', belongsTo(dup.belongsToSeries, seriesDocId, seriesId), `belongsTo=${JSON.stringify(dup.belongsToSeries)}`);
    } else {
      // 后端缺陷说明（不计入 PASS/FAIL，避免重复小红，仅留痕）
      out.push(`INFO  duplicate 后端缺陷: ${errMsg}（无法创建副本, 需后端修复 populate select 语法）`);
    }
  } else {
    check('duplicate(需场次1)', false, 'a1 缺失');
  }

  // 7) 排期
  const sched = { weekdays: [1, 3, 5], startTime: '09:00', durationMin: 90, generateWeeks: 8 };
  r = await api('PUT', `/zhao-point/v1/admin/adm/series/${seriesDocId}`, { token: adminToken, body: { schedule: sched } });
  const gotSched = (r.json && r.json.data && r.json.data.schedule) || null;
  check('保存排期成功(weekdays=1,3,5;09:00;90min)', r.status === 200 && gotSched && Array.isArray(gotSched.weekdays) && gotSched.weekdays.length === 3 && gotSched.durationMin === 90,
    `${r.status} schedule=${JSON.stringify(gotSched)}`);

  // 8) 手工生成 count=3
  let g1;
  r = await api('POST', `/zhao-point/v1/admin/adm/series/${seriesDocId}/generate?count=3`, { token: adminToken });
  g1 = (r.json && r.json.data) || r.json;
  check('手工生成 count=3 -> generated=3', r.status === 200 && Number(g1 && g1.generated) === 3, `${r.status} ${JSON.stringify(g1)}`);

  // 9) 幂等/查重：再次 generate。后端按"未来时槽查重滚动补齐"，不回 0；以无同槽重复断言
  r = await api('POST', `/zhao-point/v1/admin/adm/series/${seriesDocId}/generate?count=3`, { token: adminToken });
  const g2 = (r.json && r.json.data) || r.json;
  const dupSLot = await client.query(`SELECT a.start_time, count(*) c FROM activities a
      JOIN activities_belongs_to_series_lnk l ON l.activity_id=a.id
      WHERE l.activity_series_id = $1 AND a.start_time IS NOT NULL GROUP BY a.start_time HAVING count(*) > 1`, [seriesId]);
  check('重复 generate(幂等查重) 未产生同(时槽)重复场次', r.status === 200 && dupSLot.rows.length === 0,
    `g1=${g1 && g1.generated} g2=${g2 && g2.generated} 重复时槽=${dupSLot.rows.length}`);

  // 10) DB 校验（经 join 表）
  const srow = await client.query(`SELECT id FROM activity_series WHERE title LIKE '验收-%' LIMIT 1`);
  const sid = srow.rows[0] && srow.rows[0].id;
  if (sid != null) {
    const q = await client.query(`SELECT count(*)::int c FROM activities a JOIN activities_belongs_to_series_lnk l ON l.activity_id=a.id WHERE l.activity_series_id=$1 AND a.status='draft'`, [sid]);
    check('DB: 系列下 draft 场次 >= 3', q.rows[0].c >= 3, `series.id=${sid} draft=${q.rows[0].c}`);
    const g = await client.query(
      `SELECT a.start_time, a.end_time FROM activities a JOIN activities_belongs_to_series_lnk l ON l.activity_id=a.id
       WHERE l.activity_series_id=$1 AND a.status='draft' AND a.start_time IS NOT NULL`, [sid]);
    const allValid = g.rows.length >= 3 && g.rows.every((x) => new Date(x.start_time) > new Date()
      && (new Date(x.end_time) - new Date(x.start_time)) === 90 * 60000
      && [1, 3, 5].includes(new Date(x.start_time).getDay()));
    check(`DB: draft 场次 start_time 未来 & end=start+90min & weekday∈{Mon,Wed,Fri}`, allValid,
      `场次数=${g.rows.length} ` + g.rows.map((x) => new Date(x.start_time).toISOString().slice(0, 10) + '(' + new Date(x.start_time).toLocaleDateString('en', { weekday: 'short' }) + ')').join(','));
  } else {
    check('DB: 未找到系列行', false, 'activity_series 无 验收-% 行');
  }

  // 11) 普通用户越权
  const uLogin = await login('zhao', 'a123456');
  const uToken = tokenOf(uLogin);
  check('普通用户 zhao 登录拿到 jwt', !!uToken, JSON.stringify(uLogin).slice(0, 60));
  r = await api('GET', '/zhao-point/v1/admin/adm/series', { token: uToken });
  check('普通用户访问 admin 系列被拒(401/403/404)', r.status === 401 || r.status === 403 || r.status === 404, `status=${r.status} ${JSON.stringify(r.json && r.json.error) || ''}`);

  // 12) 公开接口
  r = await api('GET', '/zhao-point/v1/series');
  const pubList = (r.json && r.json.data) || [];
  check('公开 GET /series 200', r.status === 200 && Array.isArray(pubList), `${r.status} 数量=${pubList.length}`);

  r = await api('GET', `/zhao-point/v1/series/${seriesDocId}`);
  const pub = (r.json && r.json.data) || {};
  const acts = Array.isArray(pub.activities) ? pub.activities : [];
  check('公开 GET /series/:docId 200 且返回 activities 数组', r.status === 200 && Array.isArray(pub.activities), `${r.status} 活动数=${acts.length}`);
  check('公开 activities 只含已发布(不含 draft)', acts.length > 0 && acts.every((x) => x.status !== 'draft'),
    `statuses=${acts.map((x) => x.status).join(',')}`);

  // 13) 清理 + join 表孤儿清除
  await client.query(`DELETE FROM activities WHERE title LIKE '验收-%'`);
  await client.query(`DELETE FROM activity_series WHERE title LIKE '验收-%'`);
  await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_series_id NOT IN (SELECT id FROM activity_series) OR activity_id NOT IN (SELECT id FROM activities)`);
  const residue = await client.query(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE '验收-%') a,
      (SELECT count(*)::int FROM activity_series WHERE title LIKE '验收-%') s,
      (SELECT count(*)::int FROM activities_belongs_to_series_lnk WHERE activity_series_id NOT IN (SELECT id FROM activity_series) OR activity_id NOT IN (SELECT id FROM activities)) l`);
  const res = residue.rows[0];
  check(`清理完成(残留 a=${res.a},s=${res.s},lnk孤儿=${res.l})`, res.a === 0 && res.s === 0 && res.l === 0, `a=${res.a} s=${res.s} l=${res.l}`);

  await client.end();

  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });