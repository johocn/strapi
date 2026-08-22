/* 讲师/场地费用结算 + 现金报名费 验收
 * 用法: cd e:\code\basic && node scripts/accept-activity-settlement.cjs
 * 覆盖:
 *  1. 造讲师(cashMode=flat/cashFee=200) + 场地(flat/cashFee=100) + 活动(现金报名 cashPrice=50, 关联讲师/场地)
 *  2. 3 名 active 报名(points_charged=50 each)
 *  3. 手动重归档(POST /adm/activities/:documentId/ledger): cashRevenue=150 / cashExpense=300 / cashNet=-150
 *     detail.cash.lecturer.source=lecturer / venue.source=venue / revenuePer={cashPrice:50,activeCount:3}
 *  4. 活动登记 settleLecturer=250 后重归档: cashExpense=350 / source=activity / cost=250
 *  5. PUT /adm/ledgers/:documentId/settle: settled+settledAt 非空 / 幂等 / pending 回退 cleared
 *  6. 零残留
 * 运行前置: 本地 Strapi develop(127.0.0.1:1337)已运行且 zhao-point 已重编译
 */
const { Client } = require('pg');
const crypto = require('crypto');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'acs_'; // 测试标识前缀(活动标题/讲师名/场地名/测试用户名)

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
  return { id: user?.id || user?.documentId, token: tokenOf(j), raw: j };
}
const q = async (sql, params) => (await client.query(sql, params)).rows;

// 删除某个活动的全部报名/签到/裂变引用, 并清理该活动上的讲师/场地 lnk
async function purgeActivity(activityId) {
  // 台账 lnk
  await client.query(`DELETE FROM activity_ledgers_activity_lnk WHERE activity_id = $1`, [activityId]);
  // 报名及其签到
  const ss = await q(`SELECT activity_signup_id::int AS id FROM activity_signups_activity_lnk WHERE activity_id = $1`, [activityId]);
  for (const s of ss) {
    const atts = await q(`SELECT activity_attendance_id::int AS id FROM activity_attendances_signup_lnk WHERE activity_signup_id = $1`, [s.id]);
    for (const at of atts) await client.query(`DELETE FROM activity_attendances WHERE id = $1`, [at.id]);
    await client.query(`DELETE FROM activity_attendances_signup_lnk WHERE activity_signup_id = $1`, [s.id]);
    await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id = $1`, [s.id]);
    await client.query(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [s.id]);
    await client.query(`DELETE FROM activity_signups WHERE id = $1`, [s.id]);
  }
  // 裂变奖励
  const rrs = await q(`SELECT activity_referral_reward_id::int AS id FROM activity_referral_rewards_activity_lnk WHERE activity_id = $1`, [activityId]);
  for (const r of rrs) {
    await client.query(`DELETE FROM activity_referral_rewards_inviter_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
    await client.query(`DELETE FROM activity_referral_rewards_invitee_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
    await client.query(`DELETE FROM activity_referral_rewards_activity_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
    await client.query(`DELETE FROM activity_referral_rewards WHERE id = $1`, [r.id]);
  }
  // 讲师/场地 关联(先于 activities 删除)
  await client.query(`DELETE FROM activities_lecturer_lnk WHERE activity_id = $1`, [activityId]);
  await client.query(`DELETE FROM activities_venue_lnk WHERE activity_id = $1`, [activityId]);
  // 活动自身
  await client.query(`DELETE FROM activities WHERE id = $1`, [activityId]);
}

// 全量清场: 台账 + 活动(signup/att/referral) + 讲师/场地 + 测试用户
async function purgeAll() {
  // 台账(直接 DELETE, 需先清其 lnk)
  const ledRows = await q(`SELECT id FROM activity_ledgers WHERE activity_title LIKE '${PF}%'`);
  for (const l of ledRows) {
    await client.query(`DELETE FROM activity_ledgers_activity_lnk WHERE activity_ledger_id = $1`, [l.id]);
    await client.query(`DELETE FROM activity_ledgers_generated_by_lnk WHERE activity_ledger_id = $1`, [l.id]);
  }
  await client.query(`DELETE FROM activity_ledgers WHERE activity_title LIKE '${PF}%'`);
  // 活动(含其 lnk/签到/裂变)
  const acts = await q(`SELECT id FROM activities WHERE title LIKE '${PF}%'`);
  for (const a of acts) await purgeActivity(a.id);
  // 讲师/场地
  await client.query(`DELETE FROM activities_lecturer_lnk WHERE lecturer_id IN (SELECT id FROM lecturers WHERE name LIKE '${PF}%')`);
  await client.query(`DELETE FROM lecturers WHERE name LIKE '${PF}%'`);
  await client.query(`DELETE FROM activities_venue_lnk WHERE venue_id IN (SELECT id FROM venues WHERE name LIKE '${PF}%')`);
  await client.query(`DELETE FROM venues WHERE name LIKE '${PF}%'`);
  // 测试用户
  const upRows = await q(`SELECT id FROM up_users WHERE username LIKE '${PF}%'`);
  for (const u of upRows) await client.query(`DELETE FROM up_users WHERE id = $1`, [u.id]);
}

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');
  const ts = Date.now();
  const RND = Math.floor(Math.random() * 1e6);
  const nm = (s) => `${PF}${s}_${ts}_${RND}`;

  // ---- 01 开头清场 ----
  await purgeAll();
  check('开头清场完成', true);

  // ---- 02 admin 登录 ----
  const adminLogin = await waitForServer();
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 80));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  // ---- 03 注册测试用户 u1/u2/u3 ----
  const users = {};
  for (const k of ['u1', 'u2', 'u3']) {
    const u = await register(nm(k));
    users[k] = { id: u.id };
    check(`注册测试用户 ${k}`, !!u.id, `id=${u.id}`);
  }

  // ---- 04 建讲师(flat/cashFee=200) ----
  const lectRes = await api('POST', '/zhao-point/v1/admin/adm/lecturers', {
    token: adminToken,
    body: { name: nm('讲师'), cashMode: 'flat', cashFee: 200, defaultBufferMin: 30 },
  });
  const lect = lectRes.json && lectRes.json.data;
  check('建讲师(cashMode=flat/cashFee=200) 成功', lectRes.status === 200 && !!lect && !!lect.id && !!lect.documentId,
    `id=${lect && lect.id} doc=${lect && lect.documentId} ${JSON.stringify(lectRes.json).slice(0, 120)}`);
  if (!lect || !lect.id) { console.error('建讲师失败，终止'); process.exit(1); }
  check('讲师 cashFee=200', Number(lect.cashFee) === 200, `fee=${lect.cashFee}`);

  // ---- 05 建场地(flat/cashFee=100) ----
  const venRes = await api('POST', '/zhao-point/v1/admin/adm/venues', {
    token: adminToken,
    body: { name: nm('场地'), cashMode: 'flat', cashFee: 100, defaultBufferMin: 15 },
  });
  const ven = venRes.json && venRes.json.data;
  check('建场地(cashMode=flat/cashFee=100) 成功', venRes.status === 200 && !!ven && !!ven.id && !!ven.documentId,
    `id=${ven && ven.id} doc=${ven && ven.documentId} ${JSON.stringify(venRes.json).slice(0, 120)}`);
  if (!ven || !ven.id) { console.error('建场地失败，终止'); process.exit(1); }
  check('场地 cashFee=100', Number(ven.cashFee) === 100, `fee=${ven.cashFee}`);

  // ---- 06 建活动 A(cashPrice=50, 绑定讲师+场地) ----
  const actRes = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: {
      title: nm('A'),
      description: '现金结算验收活动A',
      capacity: 100,
      status: 'signup_open',
      cashPrice: 50,
      startTime: new Date(Date.now() + 2 * 86400e3).toISOString(),
      endTime: new Date(Date.now() + 3 * 86400e3).toISOString(),
      lecturer: { connect: [{ id: lect.id }] },
      venue: { connect: [{ id: ven.id }] },
    },
  });
  const A = actRes.json && actRes.json.data;
  check('建活动 A(cashPrice=50, 绑定讲师+场地) 成功', actRes.status === 200 && !!A && !!A.documentId && !!A.id,
    `doc=${A && A.documentId} id=${A && A.id} ${JSON.stringify(actRes.json).slice(0, 140)}`);
  if (!A || !A.documentId) { console.error('建活动失败，终止'); process.exit(1); }

  // ---- 07 直插 3 条 active 报名(points_charged=50 each, 绑定活动 A + 3 个不同 user) ----
  const insSignup = async (uid, status, points) => {
    const sig = await client.query(
      `INSERT INTO activity_signups (document_id,status,points_charged,signup_at,created_at,updated_at)
       VALUES ($1,$2,$3,now(),now(),now()) RETURNING id`,
      [crypto.randomUUID(), status, points]);
    await client.query(`INSERT INTO activity_signups_activity_lnk (activity_signup_id,activity_id) VALUES ($1,$2)`, [sig.rows[0].id, A.id]);
    await client.query(`INSERT INTO activity_signups_user_lnk (activity_signup_id,user_id) VALUES ($1,$2)`, [sig.rows[0].id, uid]);
    return sig.rows[0].id;
  };
  const s1 = await insSignup(users.u1.id, 'active', 50);
  const s2 = await insSignup(users.u2.id, 'active', 50);
  const s3 = await insSignup(users.u3.id, 'active', 50);
  check('直插 3 条 active 报名(points=50 each, 3 不同 user)', s1 && s2 && s3, `ids=${s1}/${s2}/${s3}`);

  // ---- 08 手动重归档(第一次) ----
  const m1 = await api('POST', `/zhao-point/v1/admin/adm/activities/${A.documentId}/ledger`, { token: adminToken });
  const d1 = m1.json && m1.json.data;
  check('手动POST /ledger 返回 200 + data', m1.status === 200 && !!d1, `${m1.status} ${JSON.stringify(m1.json).slice(0, 120)}`);
  check('snapshotNo=1(首次)', d1 && d1.snapshotNo === 1, `no=${d1 && d1.snapshotNo}`);
  check('cashRevenue=150(3×50)', d1 && Number(d1.cashRevenue) === 150, `v=${d1 && d1.cashRevenue}`);
  check('cashExpense=300(讲200+场100, 回退主档)', d1 && Number(d1.cashExpense) === 300, `v=${d1 && d1.cashExpense}`);
  check('cashNet=-150', d1 && Number(d1.cashNet) === -150, `v=${d1 && d1.cashNet}`);
  check('detail.cash.lecturer.source=lecturer', d1 && d1.detail && d1.detail.cash && d1.detail.cash.lecturer.source === 'lecturer',
    JSON.stringify(d1 && d1.detail && d1.detail.cash));
  check('detail.cash.lecturer.cost=200', d1 && d1.detail && Number(d1.detail.cash.lecturer.cost) === 200, `v=${d1 && d1.detail && d1.detail.cash && d1.detail.cash.lecturer.cost}`);
  check('detail.cash.venue.source=venue', d1 && d1.detail && d1.detail.cash && d1.detail.cash.venue.source === 'venue',
    JSON.stringify(d1 && d1.detail && d1.detail.cash));
  check('detail.cash.venue.cost=100', d1 && d1.detail && Number(d1.detail.cash.venue.cost) === 100, `v=${d1 && d1.detail && d1.detail.cash && d1.detail.cash.venue.cost}`);
  check('detail.cash.revenuePer={cashPrice:50,activeCount:3}', d1 && d1.detail && Number(d1.detail.cash.revenuePer.cashPrice) === 50 && d1.detail.cash.revenuePer.activeCount === 3,
    JSON.stringify(d1 && d1.detail && d1.detail.cash && d1.detail.cash.revenuePer));

  // ---- 09 更新活动 settleLecturer=250 → 重归档 ----
  const upRes = await api('PUT', `/zhao-point/v1/admin/adm/activities/${A.documentId}`, { token: adminToken, body: { settleLecturer: 250 } });
  check('PUT 更新活动 settleLecturer=250', upRes.status === 200, `${upRes.status} ${JSON.stringify(upRes.json).slice(0, 120)}`);
  const m2 = await api('POST', `/zhao-point/v1/admin/adm/activities/${A.documentId}/ledger`, { token: adminToken });
  const d2 = m2.json && m2.json.data;
  check('重归档后返回最新快照', m2.status === 200 && !!d2, `${m2.status} ${JSON.stringify(m2.json).slice(0, 120)}`);
  check('snapshotNo=2', d2 && d2.snapshotNo === 2, `no=${d2 && d2.snapshotNo}`);
  check('最新 cashExpense=350(讲250+场100)', d2 && Number(d2.cashExpense) === 350, `v=${d2 && d2.cashExpense}`);
  check('最新 cashNet=150-350=-200', d2 && Number(d2.cashNet) === -200, `v=${d2 && d2.cashNet}`);
  check('detail.cash.lecturer.source=activity', d2 && d2.detail && d2.detail.cash && d2.detail.cash.lecturer.source === 'activity',
    JSON.stringify(d2 && d2.detail && d2.detail.cash));
  check('detail.cash.lecturer.cost=250', d2 && d2.detail && Number(d2.detail.cash.lecturer.cost) === 250, `v=${d2 && d2.detail && d2.detail.cash && d2.detail.cash.lecturer.cost}`);
  // 多快照存在, 按 snapshotNo 最大校验(最新)
  const newest = await q(`SELECT document_id, snapshot_no, cash_expense FROM activity_ledgers WHERE activity_title LIKE '${PF}%' ORDER BY snapshot_no DESC LIMIT 1`);
  check('DB 最新快照(按 snapshotNo desc) cashExpense=350',
    newest[0] && Number(newest[0].cash_expense) === 350, JSON.stringify(newest[0]));

  // ---- 10 settle 接口 ----
  const ledgerDocId = d2 && d2.documentId;
  check('取最新 ledger 的 documentId', !!ledgerDocId, `doc=${ledgerDocId}`);
  if (!ledgerDocId) { console.error('无 ledger documentId，终止'); process.exit(1); }

  const st1 = await api('PUT', `/zhao-point/v1/admin/adm/ledgers/${ledgerDocId}/settle`, { token: adminToken, body: { settleStatus: 'settled' } });
  const sd1 = st1.json && st1.json.data;
  check('PUT settle(settled) 返回 200 + data', st1.status === 200 && !!sd1, `${st1.status} ${JSON.stringify(st1.json).slice(0, 120)}`);
  check('settleStatus=settled', sd1 && sd1.settleStatus === 'settled', `st=${sd1 && sd1.settleStatus}`);
  check('settledAt 非空', sd1 && !!sd1.settledAt, `at=${sd1 && sd1.settledAt}`);

  // 幂等: 重复 settled
  const st2 = await api('PUT', `/zhao-point/v1/admin/adm/ledgers/${ledgerDocId}/settle`, { token: adminToken, body: { settleStatus: 'settled' } });
  const sd2 = st2.json && st2.json.data;
  check('重复 settle(settled) 幂等仍 settled + settledAt 非空', st2.status === 200 && sd2 && sd2.settleStatus === 'settled' && !!sd2.settledAt,
    `st=${sd2 && sd2.settleStatus} at=${sd2 && sd2.settledAt}`);

  // 回退 pending: settledAt=null
  const st3 = await api('PUT', `/zhao-point/v1/admin/adm/ledgers/${ledgerDocId}/settle`, { token: adminToken, body: { settleStatus: 'pending' } });
  const sd3 = st3.json && st3.json.data;
  check('PUT settle(pending) 回退', st3.status === 200 && !!sd3, `${st3.status} ${JSON.stringify(st3.json).slice(0, 120)}`);
  check('settleStatus=pending', sd3 && sd3.settleStatus === 'pending', `st=${sd3 && sd3.settleStatus}`);
  check('settledAt=null(已清空)', sd3 && (sd3.settledAt === null || sd3.settledAt === undefined), `at=${sd3 && sd3.settledAt}`);
  // DB 印证 pending 回退
  const dbLed = await q(`SELECT settle_status, settled_at FROM activity_ledgers WHERE document_id = $1`, [ledgerDocId]);
  check('DB：settleStatus=pending 且 settledAt=null', dbLed[0] && dbLed[0].settle_status === 'pending' && dbLed[0].settled_at === null,
    JSON.stringify(dbLed[0]));

  // ---- 11 清理零残留 ----
  await purgeAll();
  const residue = await q(`SELECT
      (SELECT count(*)::int FROM activity_ledgers WHERE activity_title LIKE '${PF}%') l,
      (SELECT count(*)::int FROM activity_ledgers_activity_lnk WHERE activity_ledger_id NOT IN (SELECT id FROM activity_ledgers)) ll,
      (SELECT count(*)::int FROM activities WHERE title LIKE '${PF}%') a,
      (SELECT count(*)::int FROM activities_lecturer_lnk WHERE lecturer_id NOT IN (SELECT id FROM lecturers)) llnk,
      (SELECT count(*)::int FROM activities_venue_lnk WHERE venue_id NOT IN (SELECT id FROM venues)) vlnk,
      (SELECT count(*)::int FROM lecturers WHERE name LIKE '${PF}%') lec,
      (SELECT count(*)::int FROM venues WHERE name LIKE '${PF}%') vencnt,
      (SELECT count(*)::int FROM activity_signups_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) su,
      (SELECT count(*)::int FROM activity_signups_user_lnk WHERE activity_signup_id NOT IN (SELECT id FROM activity_signups)) sul,
      (SELECT count(*)::int FROM activity_attendances_signup_lnk WHERE activity_attendance_id NOT IN (SELECT id FROM activity_attendances) OR activity_signup_id NOT IN (SELECT id FROM activity_signups)) atl,
      (SELECT count(*)::int FROM activity_referral_rewards_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) rr,
      (SELECT count(*)::int FROM up_users WHERE username LIKE '${PF}%') u`);
  const res = residue[0];
  check(`清理完成(台账=${res.l} 台账lnk孤儿=${res.ll} 活动=${res.a} 讲师lnk孤儿=${res.llnk} 场地lnk孤儿=${res.vlnk} 讲师=${res.lec} 场地=${res.vencnt} 报名lnk孤儿=${res.su} 报名user孤儿=${res.sul} 签到lnk孤儿=${res.atl} 裂变lnk孤儿=${res.rr} 测试用户=${res.u})`,
    res.l === 0 && res.ll === 0 && res.a === 0 && res.llnk === 0 && res.vlnk === 0 && res.lec === 0 && res.vencnt === 0 && res.su === 0 && res.sul === 0 && res.atl === 0 && res.rr === 0 && res.u === 0);

  await client.end();
  console.log('\n===== 验收结果 =====');
  out.forEach((x) => console.log(x));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });