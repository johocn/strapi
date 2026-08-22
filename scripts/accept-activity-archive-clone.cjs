/* 活动归档生命周期(C) + 一键克隆(D) 端到端验收
 * 用法: cd e:\code\basic && node scripts/accept-activity-archive-clone.cjs
 * 覆盖(对齐实施计划 + 设计契约):
 *   C) 建活动 A(ended) → POST archive → status=archived; 重复 archive 幂等
 *      → GET /activities(C端) 不含 A; adminList?status=archived 含 A
 *      → POST unarchive → 回 ended; 对 signup_open 活动 archive 返回 400
 *   D) 建活动 A(ended, 含 category/tags/assets/cashPrice/settle/lecturer/venue/formConfig)
 *      → POST duplicate → 副本 title 含「（副本）」、status=draft、startTime/endTime null、
 *        formConfig/category/tags/assets/cashPrice/lecturer/venue 一致、preUnlock 复制、副本不继承 signup
 *   清理: 删副本+活动+讲师/场地+ledgers/signups 参照既有模板; 断言零残留
 * 依赖: 本地 Strapi develop(127.0.0.1:1337) + PostgreSQL 已启动。
 */
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'AAC'; // 数据前缀，便于隔离与清理
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
  for (let i = 0; i < 60; i++) {
    const r = await api('POST', '/zhao-auth/v1/login', { body: ADMIN });
    if (r.status === 200 && (r.json?.jwt || r.json?.data?.jwt)) return r.json;
    await sleep(1000);
  }
  return null;
}
const tokenOf = (j) =>
  (j && (j.jwt || j.access_token || j.token || (j.data && (j.data.jwt || j.data.token || j.data.access_token)))) || null;

const q = async (sql, params) => (await client.query(sql, params)).rows;
const q1 = async (sql, params) => (await client.query(sql, params)).rows[0];

// 清场：删除所有 AAC 前缀活动(先删 signup/attendance/ledger 引用) + 系列 + 讲师/场地 + 文章/课时
async function purgeAll() {
  // 系列先删(活动 belongToSeries 引用)
  const series = await q(`SELECT id FROM activity_series WHERE title LIKE '${PF}-%'`);
  for (const s of series) {
    await q(`DELETE FROM activity_series_activities_lnk WHERE activity_series_id = $1`, [s.id]);
    await q(`DELETE FROM activity_series WHERE id = $1`, [s.id]);
  }
  const acts = await q(`SELECT id FROM activities WHERE title LIKE '${PF}-%'`);
  for (const a of acts) {
    // ledger 引用(经 lnk 表；按 activity id 找 ledger)
    const leds = await q(`SELECT activity_ledger_id::int AS id FROM activity_ledgers_activity_lnk WHERE activity_id = $1`, [a.id]);
    for (const l of leds) {
      await q(`DELETE FROM activity_ledgers_activity_lnk WHERE activity_ledger_id = $1`, [l.id]);
      await q(`DELETE FROM activity_ledgers_generated_by_lnk WHERE activity_ledger_id = $1`, [l.id]);
      await q(`DELETE FROM activity_ledgers WHERE id = $1`, [l.id]);
    }
    await q(`DELETE FROM activity_ledgers_activity_lnk WHERE activity_id = $1`, [a.id]);
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

  if (!(await waitForServer())) { console.error('dev 未就绪，终止'); process.exit(1); }
  console.log('dev 就绪');

  await purgeAll();
  const adminLogin = await waitForServer();
  const token = tokenOf(adminLogin);
  check('admin 登录拿到 jwt', !!token);
  if (!token) { console.error('admin 登录失败，终止'); process.exit(1); }

  // ====== 预置 preUnlock 文章 + 课时（复用库中已有行，仅做关联断言） ======
  const article = await q1(`SELECT id FROM zhao_website_articles WHERE title NOT LIKE '${PF}-%' ORDER BY id LIMIT 1`);
  const lesson = await q1(`SELECT id FROM zhao_course_lessons WHERE title NOT LIKE '${PF}-%' ORDER BY id LIMIT 1`);
  const artId = article?.id ?? null;
  const lesId = lesson?.id ?? null;
  // 库中可能无文章/课时，仅记录可用性（非硬性断言），preUnlock 复制断言按实际关联数校验

  // ====== 创建讲师 + 场地 ======
  const lectRes = await api('POST', '/zhao-point/v1/admin/adm/lecturers', { token, body: { name: nm('讲师C'), defaultBufferMin: 30 } });
  const lect = lectRes.json?.data;
  check('创建讲师C成功', lectRes.status === 200 && !!lect?.id, JSON.stringify(lect));
  const venRes = await api('POST', '/zhao-point/v1/admin/adm/venues', { token, body: { name: nm('场地D'), defaultBufferMin: 15 } });
  const ven = venRes.json?.data;
  check('创建场地D成功', venRes.status === 200 && !!ven?.id, JSON.stringify(ven));

  // ====== 创建活动 A(ended) 含模板性配置 ======
  const H = 3600 * 1000;
  const startA = new Date(Date.now() - 48 * H).toISOString();
  const endA = new Date(new Date(startA).getTime() + 2 * H).toISOString();
  const formConfig = { fields: [{ k: 'name', label: '姓名', required: true }] };
  const actARes = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token,
    body: {
      title: nm('活动A'), description: '归档克隆验收', category: '运营', tags: ['A', 'B'],
      assets: { recordingUrl: 'https://x/rec', materials: [{ url: 'https://x/m', name: 'm1' }] },
      startTime: startA, endTime: endA, capacity: 50, status: 'ended',
      cashPrice: 99, settleLecturer: 50, settleVenue: 20, remindLeadMinutes: 30,
      formConfig,
      lecturer: { connect: [{ id: lect.id }] }, venue: { connect: [{ id: ven.id }] },
      preUnlockArticles: artId ? [artId] : [],
      preUnlockLessons: lesId ? [lesId] : [],
    },
  });
  const actA = actARes.json?.data;
  check('创建活动 A 成功(ended, 含模板配置)', actARes.status === 200 && !!actA?.id, JSON.stringify(actA));
  if (!actA?.id) { console.error('活动 A 创建失败，终止'); process.exit(1); }
  const A_DID = actA.documentId;

  // 创建活动 B(signup_open) 用于归档 400 校验
  const startB = new Date(Date.now() + 24 * H).toISOString();
  const endB = new Date(new Date(startB).getTime() + 1 * H).toISOString();
  const actBRes = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token, body: { title: nm('活动B'), startTime: startB, endTime: endB, capacity: 30, status: 'signup_open' },
  });
  const actB = actBRes.json?.data;
  check('创建活动 B(signup_open)', actBRes.status === 200 && !!actB?.id, JSON.stringify(actB));

  // ================= C: 归档生命周期 =================
  // 归档 A(ended -> archived)
  const archRes = await api('POST', `/zhao-point/v1/admin/adm/activities/${A_DID}/archive`, { token });
  check('归档 A -> archived', archRes.status === 200 && archRes.json?.data?.status === 'archived', JSON.stringify(archRes.json));
  // 幂等：重复归档
  const arch2 = await api('POST', `/zhao-point/v1/admin/adm/activities/${A_DID}/archive`, { token });
  check('重复归档幂等', arch2.status === 200 && arch2.json?.data?.status === 'archived', JSON.stringify(arch2.json));
  // C 端列表不含 A
  const cList = await api('GET', '/zhao-point/v1/activities', {});
  const cHasA = (cList.json?.data || []).some((x) => x.documentId === A_DID);
  check('C端列表不含归档 A', cList.status === 200 && !cHasA, `data=${JSON.stringify(cList.json?.data)}`);
  // adminList?status=archived 含 A
  const admArch = await api('GET', '/zhao-point/v1/admin/adm/activities?status=archived', { token });
  const admArchHasA = (admArch.json?.data || []).some((x) => x.documentId === A_DID);
  check('adminList?status=archived 含 A', admArch.status === 200 && admArchHasA, JSON.stringify(admArch.json));
  // 对 signup_open 的 B 归档返回 400
  const archB = await api('POST', `/zhao-point/v1/admin/adm/activities/${actB.documentId}/archive`, { token });
  check('归档 signup_open B 返回 400', archB.status === 400, JSON.stringify(archB.json));
  // 恢复 A(archived -> ended)
  const unarchRes = await api('POST', `/zhao-point/v1/admin/adm/activities/${A_DID}/unarchive`, { token });
  check('恢复 A -> ended', unarchRes.status === 200 && unarchRes.json?.data?.status === 'ended', JSON.stringify(unarchRes.json));
  // 对非 archived 恢复返回 400
  const unarchB = await api('POST', `/zhao-point/v1/admin/adm/activities/${actB.documentId}/unarchive`, { token });
  check('恢复非 archived B 返回 400', unarchB.status === 400, JSON.stringify(unarchB.json));

  // ================= D: 一键克隆 =================
  const dupRes = await api('POST', `/zhao-point/v1/admin/adm/activities/${A_DID}/duplicate`, { token });
  const dup = dupRes.json?.data;
  check('duplicate 返回副本', dupRes.status === 200 && !!dup?.documentId, JSON.stringify(dupRes.json));
  // 用 adminList(populate:"*") 拉完整副本
  const admList = await api('GET', '/zhao-point/v1/admin/adm/activities', { token });
  const dupRow = (admList.json?.data || []).find((x) => x.documentId === dup?.documentId);
  check('副本 title 含「（副本）」', !!dupRow && String(dupRow.title).includes('（副本）'), dupRow?.title);
  check('副本 status=draft', dupRow?.status === 'draft', dupRow?.status);
  check('副本 startTime/endTime null', dupRow?.startTime === null && dupRow?.endTime === null, `${dupRow?.startTime}/${dupRow?.endTime}`);
  check('副本 formConfig 一致', JSON.stringify(dupRow?.formConfig) === JSON.stringify(formConfig), JSON.stringify(dupRow?.formConfig));
  check('副本 category=templates', dupRow?.category === '运营', dupRow?.category);
  check('副本 tags 一致', JSON.stringify(dupRow?.tags) === JSON.stringify(['A', 'B']), JSON.stringify(dupRow?.tags));
  check('副本 assets 一致', (dupRow?.assets?.recordingUrl === 'https://x/rec' && dupRow?.assets?.materials?.[0]?.url === 'https://x/m'), JSON.stringify(dupRow?.assets));
  check('副本 cashPrice=99', Number(dupRow?.cashPrice) === 99, dupRow?.cashPrice);
  check('副本 settleLecturer=50 / settleVenue=20', Number(dupRow?.settleLecturer) === 50 && Number(dupRow?.settleVenue) === 20, `${dupRow?.settleLecturer}/${dupRow?.settleVenue}`);
  check('副本 remindLeadMinutes=30', Number(dupRow?.remindLeadMinutes) === 30, dupRow?.remindLeadMinutes);
  check('副本 lecturer 一致', dupRow?.lecturer?.id === lect.id, JSON.stringify(dupRow?.lecturer));
  check('副本 venue 一致', dupRow?.venue?.id === ven.id, JSON.stringify(dupRow?.venue));
  check('副本 usedCapacity=0', dupRow?.usedCapacity === 0, dupRow?.usedCapacity);
  const dupPre = (dupRow?.preUnlockArticles || []).length + (dupRow?.preUnlockLessons || []).length;
  check('副本 preUnlock 关系已复制', dupPre >= (artId ? 1 : 0) + (lesId ? 1 : 0), `preUnlock len=${dupPre}`);

  // ================= 清理 + 零残留 =================
  await purgeAll();
  const leftoverActs = await q(`SELECT id FROM activities WHERE title LIKE '${PF}-%'`);
  const leftoverLects = await q(`SELECT id FROM lecturers WHERE name LIKE '${PF}-%'`);
  const leftoverVens = await q(`SELECT id FROM venues WHERE name LIKE '${PF}-%'`);
  const leftoverSeries = await q(`SELECT id FROM activity_series WHERE title LIKE '${PF}-%'`);
  check('清理后零残留(activities/lecturers/venues/series)',
    leftoverActs.length === 0 && leftoverLects.length === 0 && leftoverVens.length === 0 && leftoverSeries.length === 0,
    `acts=${leftoverActs.length} lects=${leftoverLects.length} vens=${leftoverVens.length} series=${leftoverSeries.length}`);

  await client.end();
  console.log('\n========== 结果 ==========');
  console.log(out.join('\n'));
  console.log(`\nPASS: ${PASS}  FAIL: ${FAIL}`);
  process.exit(FAIL === 0 ? 0 : 1);
}

main().catch((e) => { console.error('异常:', e); process.exit(1); });