/* 经营复盘·对账归档 验收
 * 用法: cd e:\code\basic && node scripts/accept-activity-ledger.cjs
 * 覆盖:
 *  1. 手动重归档(POST /adm/activities/:documentId/ledger): revenuePoints/referralCostPoints/
 *     signinCostPoints(动态规则×到场)/netPoints/snapshotNo/source/detail/summary
 *  2. snapshotNo 逐次 +1, 手动总快照数累积
 *  3. POST /close 触发 auto 归档, 幂等(仅 1 张 auto)
 *  4. GET /adm/ledgers?activityDocumentId= 列表返回全部快照
 *  5. 零残留
 * 运行前置: 本地 Strapi develop(127.0.0.1:1337)已运行且 zhao-point 已重编译(accept 前 npm run build)
 */
const { Client } = require('pg');
const crypto = require('crypto');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'al_'; // 测试标识前缀(活动标题/测试用户名)

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

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');
  const ts = Date.now();
  const RND = Math.floor(Math.random() * 1e6);
  const nm = (s) => `${PF}${s}_${ts}_${RND}`;

  // ---- 清场(开头): 本插件验收用所有残留(活动标题 al_% + 测试用户 al_%) ----
  // 台账 + 其 lnk
  const ledRows = await q(`SELECT id FROM activity_ledgers WHERE activity_title LIKE 'al_%'`);
  for (const l of ledRows) {
    await client.query(`DELETE FROM activity_ledgers_activity_lnk WHERE activity_ledger_id = $1`, [l.id]);
    await client.query(`DELETE FROM activity_ledgers_generated_by_lnk WHERE activity_ledger_id = $1`, [l.id]);
  }
  await client.query(`DELETE FROM activity_ledgers WHERE activity_title LIKE 'al_%'`);
  // 活动及其报名/到场/裂变
  const acts = await q(`SELECT id FROM activities WHERE title LIKE 'al_%'`);
  for (const a of acts) {
    const ss = await q(`SELECT activity_signup_id::int AS id FROM activity_signups_activity_lnk WHERE activity_id = $1`, [a.id]);
    for (const s of ss) {
      // 签到(经 activity_attendances_signup_lnk)
      const atts = await q(`SELECT activity_attendance_id::int AS id FROM activity_attendances_signup_lnk WHERE activity_signup_id = $1`, [s.id]);
      for (const at of atts) await client.query(`DELETE FROM activity_attendances WHERE id = $1`, [at.id]);
      await client.query(`DELETE FROM activity_attendances_signup_lnk WHERE activity_signup_id = $1`, [s.id]);
      await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id = $1`, [s.id]);
      await client.query(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [s.id]);
      await client.query(`DELETE FROM activity_signups WHERE id = $1`, [s.id]);
    }
    await client.query(`DELETE FROM activity_attendances_signup_lnk WHERE activity_attendance_id NOT IN (SELECT id FROM activity_attendances)`);
    const rrs = await q(`SELECT activity_referral_reward_id::int AS id FROM activity_referral_rewards_activity_lnk WHERE activity_id = $1`, [a.id]);
    for (const r of rrs) {
      await client.query(`DELETE FROM activity_referral_rewards_inviter_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
      await client.query(`DELETE FROM activity_referral_rewards_invitee_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
      await client.query(`DELETE FROM activity_referral_rewards_activity_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
      await client.query(`DELETE FROM activity_referral_rewards WHERE id = $1`, [r.id]);
    }
    await client.query(`DELETE FROM activities WHERE id = $1`, [a.id]);
  }
  const upRows = await q(`SELECT id FROM up_users WHERE username LIKE '${PF}%'`);
  for (const u of upRows) await client.query(`DELETE FROM up_users WHERE id = $1`, [u.id]);

  // ---- admin 登录 ----
  const adminLogin = await waitForServer();
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 80));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  // ---- 测试用户 ----
  const users = {};
  for (const k of ['u1', 'u2', 'u3']) {
    const u = await register(nm(k));
    users[k] = { id: u.id };
    check(`注册测试用户 ${k}`, !!u.id, `id=${u.id}`);
  }

  // ---- 动态读取活动到场规则分值(与 point.getMergedRule 同口径: DB 优先, 兜底默认配置) ----
  const ruleRow = (await q(`SELECT points FROM zhao_point_rules WHERE action='activity_attend' AND enabled=true AND deleted_at IS NULL ORDER BY id LIMIT 1`))[0];
  const attendRulePoints = ruleRow ? Number(ruleRow.points) : 20; // 默认配置 activity_attend=20
  check('读取 activity_attend 规则分值(DB或默认)', typeof attendRulePoints === 'number' && attendRulePoints > 0, `points=${attendRulePoints}`);

  // ---- 构造活动 A(status=signup_open, 标题 al_%) ----
  const actRes = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: {
      title: nm('A'),
      description: '台账验收活动A',
      capacity: 100,
      status: 'signup_open',
      startTime: new Date(Date.now() + 2 * 86400e3).toISOString(),
      endTime: new Date(Date.now() + 3 * 86400e3).toISOString(),
    },
  });
  const A = actRes.json && actRes.json.data;
  check('建活动 A(signup_open) 成功', actRes.status === 200 && !!A && !!A.documentId && !!A.id, `doc=${A && A.documentId} id=${A && A.id}`);
  if (!A) { console.error('建活动失败，终止'); process.exit(1); }

  // ---- 直插报名: active(50) + cancelled + waiting ----
  const insSignup = async (uid, { status = 'active', points = 0 } = {}) => {
    const sig = await client.query(
      `INSERT INTO activity_signups (document_id,status,points_charged,signup_at,created_at,updated_at)
       VALUES ($1,$2,$3,now(),now(),now()) RETURNING id`,
      [crypto.randomUUID(), status, points]);
    await client.query(`INSERT INTO activity_signups_activity_lnk (activity_signup_id,activity_id) VALUES ($1,$2)`, [sig.rows[0].id, A.id]);
    await client.query(`INSERT INTO activity_signups_user_lnk (activity_signup_id,user_id) VALUES ($1,$2)`, [sig.rows[0].id, uid]);
    return sig.rows[0].id;
  };
  const sActive = await insSignup(users.u1.id, { status: 'active', points: 50 });
  const sCancelled = await insSignup(users.u2.id, { status: 'cancelled' });
  const sWaiting = await insSignup(users.u3.id, { status: 'waiting' });
  check('直插 active(50)/cancelled/waiting 报名', sActive && sCancelled && sWaiting);

  // ---- 直插签到: 2 条 points_granted=true(记入 signin 成本) + 1 条=false(不计入) ----
  const insAttendance = async (signupId, granted) => {
    const att = await client.query(
      `INSERT INTO activity_attendances (document_id,method,checkin_at,points_granted,created_at,updated_at)
       VALUES ($1,'worker_scan',now(),$2,now(),now()) RETURNING id`,
      [crypto.randomUUID(), granted]);
    await client.query(`INSERT INTO activity_attendances_signup_lnk (activity_attendance_id,activity_signup_id) VALUES ($1,$2)`, [att.rows[0].id, signupId]);
    return att.rows[0].id;
  };
  const a1 = await insAttendance(sActive, true);
  const a2 = await insAttendance(sActive, true);
  const a3 = await insAttendance(sCancelled, false);
  check('直插签到: 2 granted=true(active) + 1 granted=false(cancelled)', a1 && a2 && a3);

  // ---- 直插裂变奖励: 1 条 points=30 ----
  const rw = await client.query(
    `INSERT INTO activity_referral_rewards (document_id,points,source_invite_code,issued_at,created_at,updated_at)
     VALUES ($1,30,'al-code',now(),now(),now()) RETURNING id`,
    [crypto.randomUUID()]);
  await client.query(`INSERT INTO activity_referral_rewards_activity_lnk (activity_referral_reward_id,activity_id) VALUES ($1,$2)`, [rw.rows[0].id, A.id]);
  await client.query(`INSERT INTO activity_referral_rewards_inviter_lnk (activity_referral_reward_id,user_id) VALUES ($1,$2)`, [rw.rows[0].id, users.u1.id]);
  await client.query(`INSERT INTO activity_referral_rewards_invitee_lnk (activity_referral_reward_id,user_id) VALUES ($1,$2)`, [rw.rows[0].id, users.u2.id]);
  check('直插裂变奖励 points=30', !!rw.rows[0].id);

  // ---- 断言口径 ----
  const expRevenue = 50;
  const expReferral = 30;
  const expSignin = 2 * attendRulePoints; // 2 条到场
  const expNet = expRevenue - expSignin - expReferral;

  // ---- 断言1: 手动第一次 POST /ledger ----
  const m1 = await api('POST', `/zhao-point/v1/admin/adm/activities/${A.documentId}/ledger`, { token: adminToken });
  const d1 = m1.json && m1.json.data;
  check('手动POST /ledger 返回 200 + data', m1.status === 200 && !!d1, `${m1.status} ${JSON.stringify(m1.json).slice(0, 120)}`);
  check('snapshotNo=1(首次)', d1 && d1.snapshotNo === 1, `no=${d1 && d1.snapshotNo}`);
  check('source=manual', d1 && d1.source === 'manual', `src=${d1 && d1.source}`);
  check(`revenuePoints=50`, d1 && d1.revenuePoints === expRevenue, `v=${d1 && d1.revenuePoints}`);
  check(`referralCostPoints=30`, d1 && d1.referralCostPoints === expReferral, `v=${d1 && d1.referralCostPoints}`);
  check(`signinCostPoints=${expSignin}(规则值×2)`, d1 && d1.signinCostPoints === expSignin, `v=${d1 && d1.signinCostPoints}`);
  check(`netPoints=${expNet}`, d1 && d1.netPoints === expNet, `v=${d1 && d1.netPoints}`);
  check('detail.signups.length=1', d1 && d1.detail && Array.isArray(d1.detail.signups) && d1.detail.signups.length === 1, JSON.stringify(d1 && d1.detail));
  check('detail.attendees.length=2', d1 && d1.detail && Array.isArray(d1.detail.attendees) && d1.detail.attendees.length === 2, JSON.stringify(d1 && d1.detail && d1.detail.attendees));
  check('detail.referrals.length=1', d1 && d1.detail && Array.isArray(d1.detail.referrals) && d1.detail.referrals.length === 1, JSON.stringify(d1 && d1.detail && d1.detail.referrals));
  check('summary: signupCount=1 attendedCount=2 cancelledCount=1 waitingCount=1',
    d1 && d1.summary && d1.summary.signupCount === 1 && d1.summary.attendedCount === 2 && d1.summary.cancelledCount === 1 && d1.summary.waitingCount === 1, JSON.stringify(d1 && d1.summary));
  check('detail.signups[0].pointsCharged=50', d1 && d1.detail && d1.detail.signups[0] && d1.detail.signups[0].pointsCharged === 50, JSON.stringify(d1 && d1.detail && d1.detail.signups));

  // ---- 断言2: 第二次手动 -> snapshotNo=2, 全表该活动 ledger count=2 ----
  const m2 = await api('POST', `/zhao-point/v1/admin/adm/activities/${A.documentId}/ledger`, { token: adminToken });
  const d2 = m2.json && m2.json.data;
  check('再次手动 snapshotNo=2', d2 && d2.snapshotNo === 2, `no=${d2 && d2.snapshotNo}`);
  check('全表该活动 ledger 数=2', (await q(`SELECT count(*)::int n FROM activity_ledgers_activity_lnk WHERE activity_id=$1`, [A.id]))[0].n === 2, `n=${(await q(`SELECT count(*)::int n FROM activity_ledgers_activity_lnk WHERE activity_id=$1`, [A.id]))[0].n}`);

  // ---- 断言3: 关闭活动 -> 自动生成 1 张 auto 快照(幂等) ----
  const cls = await api('POST', `/zhao-point/v1/admin/adm/activities/${A.documentId}/close`, { token: adminToken });
  check('POST /close 返回 200', cls.status === 200, `${cls.status} ${JSON.stringify(cls.json).slice(0, 120)}`);
  const autoCount1 = (await q(`SELECT count(*)::int n FROM activity_ledgers_activity_lnk l JOIN activity_ledgers v ON v.id=l.activity_ledger_id WHERE l.activity_id=$1 AND v.source='auto'`, [A.id]))[0].n;
  check('close 后该活动 auto 快照恰 1 张', autoCount1 === 1, `n=${autoCount1}`);
  // 再次 close → 幂等 auto 不爆量
  await api('POST', `/zhao-point/v1/admin/adm/activities/${A.documentId}/close`, { token: adminToken });
  const autoCount2 = (await q(`SELECT count(*)::int n FROM activity_ledgers_activity_lnk l JOIN activity_ledgers v ON v.id=l.activity_ledger_id WHERE l.activity_id=$1 AND v.source='auto'`, [A.id]))[0].n;
  check('再次 close 后 auto 仍恰 1 张(幂等)', autoCount2 === 1, `n=${autoCount2}`);
  // auto 快照 snapshotNo 为 3(前两张 manual 后)
  const autoLed = (await q(`SELECT v.snapshot_no::int s, v.source, v.revenue_points, v.net_points FROM activity_ledgers_activity_lnk l JOIN activity_ledgers v ON v.id=l.activity_ledger_id WHERE l.activity_id=$1 AND v.source='auto'`, [A.id]))[0];
  check('auto 快照 snapshotNo=3 且数值一致', autoLed && autoLed.s === 3 && autoLed.revenue_points === expRevenue && autoLed.net_points === expNet, JSON.stringify(autoLed));

  // ---- 断言4: GET /ledgers?activityDocumentId= 返回该活动全部快照 ----
  const list = await api('GET', `/zhao-point/v1/admin/adm/ledgers?activityDocumentId=${A.documentId}&page=1&pageSize=20`, { token: adminToken });
  const listData = list.json && list.json.data;
  check('GET /ledgers 200 且返回 data 数组+mata.pagination', list.status === 200 && Array.isArray(listData) && !!list.json.meta && !!list.json.meta.pagination, `${list.status} ${JSON.stringify(list.json).slice(0, 120)}`);
  check('ledgers 列表返回该活动全部 3 张快照', Array.isArray(listData) && listData.length === 3 && listData.every((x) => x.activityDocumentId === A.documentId), `len=${Array.isArray(listData) ? listData.length : 'na'}`);
  const listAutos = listData.filter((x) => x.source === 'auto');
  const listManuals = listData.filter((x) => x.source === 'manual');
  check('列表内 auto 1 张 / manual 2 张', listAutos.length === 1 && listManuals.length === 2, `auto=${listAutos.length} manual=${listManuals.length}`);

  // ---- 断言5: 清理零残留 ----
  const manifest = { ledgers: [], attendances: [], _ledgersLnk: 0, _attsLnk: 0 };
  // 台账
  const delLed = await q(`SELECT id FROM activity_ledgers WHERE activity_title LIKE 'al_%'`);
  for (const l of delLed) {
    await client.query(`DELETE FROM activity_ledgers_activity_lnk WHERE activity_ledger_id = $1`, [l.id]);
    await client.query(`DELETE FROM activity_ledgers_generated_by_lnk WHERE activity_ledger_id = $1`, [l.id]);
  }
  await client.query(`DELETE FROM activity_ledgers WHERE activity_title LIKE 'al_%'`);
  manifest.ledgers = delLed.length;
  // 活动 A 及其数据
  const delActs = await q(`SELECT id FROM activities WHERE title LIKE 'al_%'`);
  for (const a of delActs) {
    const ss = await q(`SELECT activity_signup_id::int AS id FROM activity_signups_activity_lnk WHERE activity_id = $1`, [a.id]);
    for (const s of ss) {
      const atts = await q(`SELECT activity_attendance_id::int AS id FROM activity_attendances_signup_lnk WHERE activity_signup_id = $1`, [s.id]);
      for (const at of atts) { await client.query(`DELETE FROM activity_attendances WHERE id = $1`, [at.id]); manifest.attendances++; }
      await client.query(`DELETE FROM activity_attendances_signup_lnk WHERE activity_signup_id = $1`, [s.id]);
      await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id = $1`, [s.id]);
      await client.query(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [s.id]);
      await client.query(`DELETE FROM activity_signups WHERE id = $1`, [s.id]);
    }
    const rrs = await q(`SELECT activity_referral_reward_id::int AS id FROM activity_referral_rewards_activity_lnk WHERE activity_id = $1`, [a.id]);
    for (const r of rrs) {
      await client.query(`DELETE FROM activity_referral_rewards_inviter_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
      await client.query(`DELETE FROM activity_referral_rewards_invitee_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
      await client.query(`DELETE FROM activity_referral_rewards_activity_lnk WHERE activity_referral_reward_id = $1`, [r.id]);
      await client.query(`DELETE FROM activity_referral_rewards WHERE id = $1`, [r.id]);
    }
    await client.query(`DELETE FROM activities WHERE id = $1`, [a.id]);
  }
  // 测试用户
  const upIds = await q(`SELECT id FROM up_users WHERE username LIKE '${PF}%'`);
  for (const u of upIds) await client.query(`DELETE FROM up_users WHERE id = $1`, [u.id]);

  const residue = await q(`SELECT
      (SELECT count(*)::int FROM activity_ledgers WHERE activity_title LIKE 'al_%') l,
      (SELECT count(*)::int FROM activity_ledgers_activity_lnk WHERE activity_ledger_id NOT IN (SELECT id FROM activity_ledgers)) ll,
      (SELECT count(*)::int FROM activity_attendances_signup_lnk atl WHERE atl.activity_signup_id IN (SELECT s.activity_signup_id FROM activity_signups_activity_lnk s JOIN activities aa ON aa.id=s.activity_id WHERE aa.title LIKE 'al_%')) at,
      (SELECT count(*)::int FROM activity_attendances_signup_lnk WHERE activity_attendance_id NOT IN (SELECT id FROM activity_attendances) OR activity_signup_id NOT IN (SELECT id FROM activity_signups)) atl,
      (SELECT count(*)::int FROM activity_signups_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) su,
      (SELECT count(*)::int FROM activity_signups_user_lnk WHERE activity_signup_id NOT IN (SELECT id FROM activity_signups)) sul,
      (SELECT count(*)::int FROM activity_referral_rewards_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) rr,
      (SELECT count(*)::int FROM activity_referral_rewards_inviter_lnk WHERE activity_referral_reward_id NOT IN (SELECT id FROM activity_referral_rewards)) ri,
      (SELECT count(*)::int FROM activity_referral_rewards_invitee_lnk WHERE activity_referral_reward_id NOT IN (SELECT id FROM activity_referral_rewards)) ri2,
      (SELECT count(*)::int FROM activities WHERE title LIKE 'al_%') a,
      (SELECT count(*)::int FROM up_users WHERE username LIKE '${PF}%') u`);
  const res = residue[0];
  check(`清理完成(台账=${res.l} 台账lnk孤儿=${res.ll} 签到=${res.at} 签到lnk孤儿=${res.atl} 报名lnk孤儿=${res.su} 报名user孤儿=${res.sul} 裂变lnk孤儿=${res.rr} inviter孤儿=${res.ri} invitee孤儿=${res.ri2} 活动=${res.a} 测试用户=${res.u})`,
    res.l === 0 && res.ll === 0 && res.at === 0 && res.atl === 0 && res.su === 0 && res.sul === 0 && res.rr === 0 && res.ri === 0 && res.ri2 === 0 && res.a === 0 && res.u === 0);

  await client.end();
  console.log('\n===== 验收结果 =====');
  out.forEach((x) => console.log(x));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });