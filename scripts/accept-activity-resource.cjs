/* 活动资源/讲师排期 验收
 * 用法: cd e:\code\basic && node scripts/accept-activity-resource.cjs
 * 覆盖(对齐实施计划 Task 7 + 功能契约):
 *   1) 资源创建(讲师甲 buffer30 / 场地乙 buffer15)
 *   2) 活动绑定资源 + 排期冲突预检 / 直接创建冲突 400 / 改期冲突 400 与空闲成功(excludeActivityId)
 *   3) 场地维度冲突 / 档期视图 / 资源停用(disabled) 列表与档期行为
 *   4) 清理零残留
 * 依赖: 本地 Strapi develop(127.0.0.1:1337) + PostgreSQL 已启动。
 */
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'PRF'; // 数据前缀，便于隔离与清理
const ADMIN = { identifier: '1117', password: 'a123456' };

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
  for (let i = 0; i < 30; i++) {
    try { r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); break; }
    catch (e) { if (i === 29) return { status: 0, json: { netErr: e.message } }; await sleep(700); }
  }
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}
async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    const r = await api('POST', '/zhao-auth/v1/login', { body: ADMIN });
    if (r.status === 200 && (r.json?.jwt || r.json?.data?.jwt)) return r.json;
    await sleep(1000);
  }
  return null;
}
const tokenOf = (j) =>
  (j && (j.jwt || j.access_token || j.token || (j.data && (j.data.jwt || j.data.token || j.data.access_token)))) || null;

const q = async (sql, params) => (await client.query(sql, params)).rows;

// 清场：删除所有 PRF 前缀的活动(先删 signup/attendance 引用) + 讲师/场地
async function purgeAll() {
  const acts = await q(`SELECT id FROM activities WHERE title LIKE '${PF}-%'`);
  for (const a of acts) {
    const ss = await q(`SELECT activity_signup_id::int AS id FROM activity_signups_activity_lnk WHERE activity_id = $1`, [a.id]);
    for (const s of ss) {
      const ats = await q(`SELECT activity_attendance_id::int AS id FROM activity_attendances_signup_lnk WHERE activity_signup_id = $1`, [s.id]);
      await q(`DELETE FROM activity_attendances_signup_lnk WHERE activity_signup_id = $1`, [s.id]);
      for (const t of ats) await q(`DELETE FROM activity_attendances WHERE id = $1`, [t.id]);
      await q(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [s.id]);
      await q(`DELETE FROM activity_signups WHERE id = $1`, [s.id]);
    }
    await q(`DELETE FROM activity_signups_activity_lnk WHERE activity_id = $1`, [a.id]);
    await q(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_id = $1`, [a.id]);
    await q(`DELETE FROM activities_lecturer_lnk WHERE activity_id = $1`, [a.id]);
    await q(`DELETE FROM activities_venue_lnk WHERE activity_id = $1`, [a.id]);
    await q(`DELETE FROM activities_learning_package_articles_lnk WHERE activity_id = $1`, [a.id]);
    await q(`DELETE FROM activities_learning_package_lessons_lnk WHERE activity_id = $1`, [a.id]);
    await q(`DELETE FROM activities_pre_unlock_articles_lnk WHERE activity_id = $1`, [a.id]);
    await q(`DELETE FROM activities_pre_unlock_lessons_lnk WHERE activity_id = $1`, [a.id]);
    await q(`DELETE FROM activities WHERE id = $1`, [a.id]);
  }
  await q(`DELETE FROM activities_lecturer_lnk WHERE lecturer_id IN (SELECT id FROM lecturers WHERE name LIKE '${PF}-%')`);
  await q(`DELETE FROM lecturers WHERE name LIKE '${PF}-%'`);
  await q(`DELETE FROM activities_venue_lnk WHERE venue_id IN (SELECT id FROM venues WHERE name LIKE '${PF}-%')`);
  await q(`DELETE FROM venues WHERE name LIKE '${PF}-%'`);
}

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');
  const ts = Date.now();
  const RND = Math.floor(Math.random() * 1e6);
  const nm = (s) => `${PF}-${s}-${ts}-${RND}`;

  if (!(await waitForServer())) { console.error('dev 未就绪(/_health 或登录失败)，终止'); process.exit(1); }
  console.log('dev 就绪');

  await purgeAll();
  const adminLogin = await waitForServer();
  const token = tokenOf(adminLogin);
  check('admin 登录拿到 jwt', !!token);
  if (!token) { console.error('admin 登录失败，终止'); process.exit(1); }

  // ============ 1) 创建讲师甲 / 场地乙 ============
  const lectRes = await api('POST', '/zhao-point/v1/admin/adm/lecturers', { token, body: { name: nm('讲师甲'), defaultBufferMin: 30 } });
  const lect = lectRes.json?.data;
  check('创建讲师甲成功(buffer30)', lectRes.status === 200 && !!lect?.id, JSON.stringify(lect));
  const venRes = await api('POST', '/zhao-point/v1/admin/adm/venues', { token, body: { name: nm('场地乙'), defaultBufferMin: 15 } });
  const ven = venRes.json?.data;
  check('创建场地乙成功(buffer15)', venRes.status === 200 && !!ven?.id, JSON.stringify(ven));
  if (!lect?.id || !ven?.id) { console.error('资源创建失败，终止'); process.exit(1); }
  check('讲师甲 defaultBufferMin=30', lect.defaultBufferMin === 30, `buffer=${lect.defaultBufferMin}`);
  check('场地乙 defaultBufferMin=15', ven.defaultBufferMin === 15, `buffer=${ven.defaultBufferMin}`);

  // ============ 2) 创建活动 A 绑定甲+乙 ============
  const H = 3600 * 1000;
  const startA = new Date(Date.now() + 24 * H).toISOString();
  const endA = new Date(new Date(startA).getTime() + 2 * H).toISOString();
  const actARes = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token,
    body: {
      title: nm('活动A'), description: '资源排期-冲突锚点',
      startTime: startA, endTime: endA, capacity: 100, status: 'signup_open',
      lecturer: { connect: [{ id: lect.id }] }, venue: { connect: [{ id: ven.id }] },
    },
  });
  const actA = actARes.json?.data;
  check('创建活动 A 成功(绑定甲+乙)', actARes.status === 200 && !!actA?.id, JSON.stringify(actA));
  if (!actA?.id) { console.error('活动 A 创建失败，终止'); process.exit(1); }
  // create 响应不长默认 populated 关系，改用列表(adminList populate:"*")确认绑定
  const listA = await api('GET', '/zhao-point/v1/admin/adm/activities', { token });
  const aRow = listA.json?.data?.find((x) => x.documentId === actA.documentId);
  check('活动 A 绑定讲师甲', aRow?.lecturer?.id === lect.id, JSON.stringify(aRow?.lecturer));
  check('活动 A 绑定场地乙', aRow?.venue?.id === ven.id, JSON.stringify(aRow?.venue));

  // ============ 3) 冲突预检：同甲跨 A 窗口 → ok=false lecturer 冲突 ============
  const overlap = { startTime: new Date(new Date(startA).getTime() + 1 * H).toISOString(), endTime: new Date(new Date(startA).getTime() + 3 * H).toISOString() };
  const chkL = await api('POST', '/zhao-point/v1/admin/adm/schedules/check', { token, body: { ...overlap, lecturerId: lect.id } });
  check('check(同甲跨A窗口) ok=false', chkL.status === 200 && chkL.json?.ok === false, `${chkL.status} ${JSON.stringify(chkL.json)}`);
  check('check conflicts[0].resourceType=lecturer', chkL.json?.conflicts?.[0]?.resourceType === 'lecturer', JSON.stringify(chkL.json?.conflicts?.[0]));
  check('check conflictActivityId===A', chkL.json?.conflicts?.[0]?.conflictActivityId === actA.id, `got=${chkL.json?.conflicts?.[0]?.conflictActivityId} expect=${actA.id}`);
  check('check conflictActivityTitle=活动A', (chkL.json?.conflicts?.[0]?.conflictActivityTitle || '').startsWith('PRF-活动A'), chkL.json?.conflicts?.[0]?.conflictActivityTitle);
  check('check suggestions 非空', Array.isArray(chkL.json?.suggestions) && chkL.json.suggestions.length > 0, JSON.stringify(chkL.json?.suggestions?.length));

  // ============ 4) 直接创建与 A 冲突的活动 → 400 排期冲突 ============
  const cRes = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token,
    body: { title: nm('冲突活动C'), startTime: overlap.startTime, endTime: overlap.endTime, capacity: 10, status: 'signup_open', lecturer: { connect: [{ id: lect.id }] } },
  });
  check('adminCreate 冲突 → HTTP 400', cRes.status === 400, `${cRes.status}`);
  check('400 body.error 含「排期冲突」', String(cRes.json?.error || '').includes('排期冲突'), cRes.json?.error);

  // ============ 5) 创建非冲突活动 B ============
  const startB = new Date(new Date(startA).getTime() + 26 * H).toISOString();
  const endB = new Date(new Date(startB).getTime() + 2 * H).toISOString();
  const actBRes = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token,
    body: { title: nm('活动B'), startTime: startB, endTime: endB, capacity: 50, status: 'signup_open', lecturer: { connect: [{ id: lect.id }] }, venue: { connect: [{ id: ven.id }] } },
  });
  const actB = actBRes.json?.data;
  check('创建非冲突活动 B 成功', actBRes.status === 200 && !!actB?.id, JSON.stringify(actB));
  if (!actB?.id) { console.error('活动 B 创建失败，终止'); process.exit(1); }

  // ============ 6) 改期 B：冲突→400；自排除→200；空闲→200 ============
  const putB = (docId, data) =>
    api('PUT', `/zhao-point/v1/admin/adm/activities/${docId}`, {
      token,
      body: { ...data, lecturer: { connect: [{ id: lect.id }] }, venue: { connect: [{ id: ven.id }] } },
    });
  const rP1 = await putB(actB.documentId, { startTime: overlap.startTime, endTime: overlap.endTime });
  check('PUT 改期 B 到冲突时段 → 400', rP1.status === 400 && String(rP1.json?.error || '').includes('排期冲突'), `${rP1.status} ${rP1.json?.error}`);
  // 移到自身原时段：仅靠 excludeActivityId 排除自身才不冲突
  const rP2 = await putB(actB.documentId, { startTime: startB, endTime: endB });
  check('PUT 改期 B 到自身原时段 → 200(excludeActivityId 自排除生效)', rP2.status === 200, `${rP2.status} ${JSON.stringify(rP2.json)}`);
  // 改到空闲时段 → 成功
  const startB2 = new Date(new Date(startA).getTime() - 6 * H).toISOString();
  const endB2 = new Date(new Date(startB2).getTime() + 2 * H).toISOString();
  const rP3 = await putB(actB.documentId, { startTime: startB2, endTime: endB2 });
  check('PUT 改期 B 到空闲时段 → 200', rP3.status === 200, `${rP3.status} ${JSON.stringify(rP3.json)}`);
  check('PUT 后 B.startTime 已更新', rP3.json?.data?.startTime === startB2, `new=${rP3.json?.data?.startTime}`);

  // ============ 7) 场地维度冲突 ============
  const chkV = await api('POST', '/zhao-point/v1/admin/adm/schedules/check', { token, body: { ...overlap, venueId: ven.id } });
  check('check(同乙跨A窗口) ok=false', chkV.status === 200 && chkV.json?.ok === false, `${chkV.status} ${JSON.stringify(chkV.json)}`);
  check('check conflicts[0].resourceType=venue', chkV.json?.conflicts?.[0]?.resourceType === 'venue', JSON.stringify(chkV.json?.conflicts?.[0]));
  check('check(venue) conflictActivityId===A', chkV.json?.conflicts?.[0]?.conflictActivityId === actA.id, `got=${chkV.json?.conflicts?.[0]?.conflictActivityId}`);

  // ============ 8) 档期视图按甲 → rows 含 A ============
  const sch = await api('GET', `/zhao-point/v1/admin/adm/schedules?type=lecturer&resourceId=${lect.id}`, { token });
  check('档期视图返回 resource/rows', sch.status === 200 && !!sch.json?.resource && Array.isArray(sch.json?.rows), JSON.stringify({ r: sch.json?.resource?.id, n: sch.json?.rows?.length }));
  check('档期视图 resource.id=甲', sch.json?.resource?.id === lect.id, `got=${sch.json?.resource?.id}`);
  check('档期 rows 含活动 A', Array.isArray(sch.json?.rows) && sch.json.rows.some((r) => r.id === actA.id), `rows=${(sch.json?.rows || []).map((r) => r.id).join(',')}`);

  // ============ 9) 停用讲师甲(软删 disabled=true) ============
  const disRes = await api('DELETE', `/zhao-point/v1/admin/adm/lecturers/${lect.documentId}`, { token });
  check('DELETE 停用讲师甲(软删)返回 disabled=true', disRes.status === 200 && disRes.json?.data?.disabled === true, `${disRes.status} ${JSON.stringify(disRes.json)}`);
  const lDefault = await api('GET', '/zhao-point/v1/admin/adm/lecturers', { token });
  check('默认列表不含甲', Array.isArray(lDefault.json?.rows) && !lDefault.json.rows.some((r) => r.id === lect.id), `n=${lDefault.json?.rows?.length}`);
  const lInc = await api('GET', '/zhao-point/v1/admin/adm/lecturers?includeDisabled=true', { token });
  const lectInc = Array.isArray(lInc.json?.rows) ? lInc.json.rows.find((r) => r.id === lect.id) : undefined;
  check('includeDisabled=true 含甲且 disabled=true', !!lectInc && lectInc.disabled === true, JSON.stringify(lectInc));
  const sch2 = await api('GET', `/zhao-point/v1/admin/adm/schedules?type=lecturer&resourceId=${lect.id}`, { token });
  check('停用后档期仍含 A', Array.isArray(sch2.json?.rows) && sch2.json.rows.some((r) => r.id === actA.id), `n=${sch2.json?.rows?.length}`);

  // ============ 10) 清理零残留 ============
  await purgeAll();
  const residue = await q(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE '${PF}-%') a,
      (SELECT count(*)::int FROM lecturers WHERE name LIKE '${PF}-%') l,
      (SELECT count(*)::int FROM venues WHERE name LIKE '${PF}-%') v`);
  const res = residue[0];
  check(`清理完成(活动=${res.a} 讲师=${res.l} 场地=${res.v})`, res.a === 0 && res.l === 0 && res.v === 0);

  await client.end();
  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`TOTAL=${PASS + FAIL} PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });