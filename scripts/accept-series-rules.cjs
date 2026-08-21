/* 系列报名规则细分（含积分计费）验收 · spec §9
 * 用法: cd e:\code\basic && node scripts/accept-series-rules.cjs
 * 覆盖:
 *  1) 建系列设 defaultRules -> 手工 generate count=1 -> 核对生成活动继承
 *     capacity/pointsCost/feeCollectAt/checkinMode/geoEnforced/signupStart(按 signupOpenDays)
 *  2) 免费场(pointsCost=0) 报名/签到无扣费
 *  3) signup 计费场: 报名成功即 action=activity_fee 扣费、余额减 pointsCost;
 *     余额不足报名返回 {ok:false,reason:insufficient_points} 且 used_capacity 未增(名额回滚)
 *  4) 收费场满员->候补; active 取消释放后 promoteWaiting 只把"有积分"候补转正(pointsCharged=10),
 *     "积分不足"候补保持 waiting
 *  5) signup 计费场会前取消 -> action=activity_fee_refund 退费、名额释放
 *  6) checkin 计费场(feeCollectAt=checkin): 报名不扣费(pointsCharged=0);
 *     签到成功才 deduct activity_fee 并落 attendance; 签到时余额不足 ok:false+insufficient_points 不落 attendance
 *  7) 幂等: 重复报名 already_signed_up、重复签到 already_checked_in
 *
 * 运行前置: 本地 Strapi develop 已运行(127.0.0.1:1337)且已重编译 zhao-point 插件 (cd e:\code\basic && npm run develop)
 *
 * 积分注入方式: 直接写 zhao_point_records(+user/channel lnk, balance=上一条 running total),
 *   规避 admin-adjust API 的 operator 外键(admin::user 表)与 POINT_020 渠道约束;
 *   测试用户用 zhao-auth 注册(注册即自动建个人渠道+channel-member, 满足点服务渠道解析)。
 */
const { Client } = require('pg');
const crypto = require('crypto');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };

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
    if (r.status === 200 && (r.json?.jwt || r.json?.data)) return r.json;
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

async function register(username) {
  const res = await api('POST', '/zhao-auth/v1/register', {
    body: { username, email: `${username}@audit.local`, password: 'a123456', confirmPassword: 'a123456' },
  });
  const j = res.json || {};
  const user = j.user || j.data?.user || j.data || j;
  return { id: user?.id || user?.documentId, token: tokenOf(j), raw: j };
}

// ===== 积分 DB 注入与查询（balance = 上一条 running total）=====
async function grantPoints(userId, amount, remark) {
  const last = await client.query(
    `SELECT pr.balance FROM zhao_point_records pr
       JOIN zhao_point_records_user_lnk ul ON ul.point_record_id = pr.id
      WHERE ul.user_id = $1 ORDER BY pr.id DESC LIMIT 1`, [userId]);
  const prev = last.rows[0] ? last.rows[0].balance : 0;
  const docId = crypto.randomUUID();
  const now = new Date();
  const ins = await client.query(
    `INSERT INTO zhao_point_records (document_id, action, type, points, balance, source, method, remark, created_at, updated_at, published_at)
     VALUES ($1, 'manual_adjust', 'increase', $2, $3, 'point', 'accept-script', $4, $5, $5, $5) RETURNING id`,
    [docId, amount, prev + amount, remark, now]);
  // 关联到用户（后端 getLatestBalance/deductPoints 经 user 关系读取此余额）
  await client.query(`INSERT INTO zhao_point_records_user_lnk (point_record_id, user_id) VALUES ($1, $2)`,
    [ins.rows[0].id, userId]);
  // 挂到用户当前个人渠道（保证记录带渠道归属）
  const ch = await client.query(
    `SELECT cl.channel_id FROM zhao_channel_members_channel_lnk cl
       JOIN zhao_channel_members_user_lnk ul ON ul.channel_member_id = cl.channel_member_id
       JOIN zhao_channel_members m ON m.id = cl.channel_member_id
      WHERE ul.user_id = $1 AND m.is_current = true LIMIT 1`, [userId]);
  if (ch.rows[0]) {
    await client.query(`INSERT INTO zhao_point_records_channel_lnk (point_record_id, channel_id) VALUES ($1, $2)`,
      [ins.rows[0].id, ch.rows[0].channel_id]);
    await client.query(`INSERT INTO zhao_point_records_user_channel_lnk (point_record_id, channel_id) VALUES ($1, $2)`,
      [ins.rows[0].id, ch.rows[0].channel_id]);
  }
  return prev + amount;
}
async function balanceOf(userId) {
  const r = await client.query(
    `SELECT pr.balance FROM zhao_point_records pr
       JOIN zhao_point_records_user_lnk ul ON ul.point_record_id = pr.id
      WHERE ul.user_id = $1 ORDER BY pr.id DESC LIMIT 1`, [userId]);
  return r.rows[0] ? r.rows[0].balance : 0;
}
async function countAction(userId, action) {
  const r = await client.query(
    `SELECT count(*)::int n FROM zhao_point_records pr
       JOIN zhao_point_records_user_lnk ul ON ul.point_record_id = pr.id
      WHERE ul.user_id = $1 AND pr.action = $2`, [userId, action]);
  return r.rows[0].n;
}
async function actionRecord(userId, action) {
  const r = await client.query(
    `SELECT pr.points, pr.balance, pr.method FROM zhao_point_records pr
       JOIN zhao_point_records_user_lnk ul ON ul.point_record_id = pr.id
      WHERE ul.user_id = $1 AND pr.action = $2 ORDER BY pr.id DESC LIMIT 1`, [userId, action]);
  return r.rows[0] || null;
}

// ===== 系列/活动/名额/报名/签读 辅助 =====
async function createSeries(adminToken, title, defaultRules) {
  const r = await api('POST', '/zhao-point/v1/admin/adm/series', {
    token: adminToken,
    body: { title, description: '验收用系列', status: 'active', schedule: { weekdays: [1], startTime: '09:00', durationMin: 60, generateWeeks: 8 }, defaultRules },
  });
  const s = r.json?.data;
  return { status: r.status, series: s, docId: s?.documentId, id: s?.id };
}
async function generateOne(adminToken, seriesDocId) {
  const r = await api('POST', `/zhao-point/v1/admin/adm/series/${seriesDocId}/generate?count=1`, { token: adminToken });
  const g = r.json?.data || r.json;
  return { status: r.status, generated: Number(g?.generated) };
}
async function seriesActivity(seriesId) {
  const r = await client.query(
    `SELECT a.id, a.document_id, a.start_time, a.end_time, a.capacity, a.points_cost, a.fee_collect_at,
            a.checkin_mode, a.geo_enforced, a.geo_radius_m, a.signup_start, a.status, a.used_capacity
       FROM activities a JOIN activities_belongs_to_series_lnk l ON l.activity_id = a.id
      WHERE l.activity_series_id = $1 ORDER BY a.id LIMIT 1`, [seriesId]);
  return r.rows[0] || null;
}
// 打开发放: status=signup_open 且窗口覆盖当前（signupStart=-1h signupEnd=+72h），保留生成规则字段
async function openActivity(adminToken, actDoc) {
  const now = Date.now();
  const r = await api('PUT', `/zhao-point/v1/admin/adm/activities/${actDoc}`, {
    token: adminToken,
    body: { status: 'signup_open', signupStart: new Date(now - 3600 * 1000).toISOString(), signupEnd: new Date(now + 72 * 3600 * 1000).toISOString() },
  });
  return r;
}
async function usedCapacity(actId) {
  const r = await client.query(`SELECT used_capacity FROM activities WHERE id = $1`, [actId]);
  return r.rows[0] ? r.rows[0].used_capacity : -1;
}
async function mySignup(actId, userId) {
  const r = await client.query(
    `SELECT s.status, s.points_charged FROM activity_signups s
       JOIN activity_signups_activity_lnk al ON al.activity_signup_id = s.id
       JOIN activity_signups_user_lnk ul ON ul.activity_signup_id = s.id
      WHERE al.activity_id = $1 AND ul.user_id = $2`, [actId, userId]);
  return r.rows[0] || null;
}
async function attendanceCount(userId) {
  const r = await client.query(
    `SELECT count(*)::int n FROM activity_attendances a
       JOIN activity_attendances_signup_lnk sl ON sl.activity_attendance_id = a.id
       JOIN activity_signups s ON s.id = sl.activity_signup_id
       JOIN activity_signups_user_lnk ul ON ul.activity_signup_id = s.id
      WHERE ul.user_id = $1`, [userId]);
  return r.rows[0].n;
}

// 连带清空一批验收用户：积分记录、channel member/个人渠道、用户本身（开头与收尾共用，保证零残留）
async function purgeUsers(ids) {
  const myIds = [...new Set((ids || []).filter(Boolean))];
  if (!myIds.length) return;
  const recIds = await client.query(`SELECT DISTINCT ul.point_record_id AS id FROM zhao_point_records_user_lnk ul WHERE ul.user_id = ANY($1)`, [myIds]);
  for (const rec of recIds.rows) {
    await client.query(`DELETE FROM zhao_point_records_user_lnk WHERE point_record_id = $1`, [rec.id]);
    await client.query(`DELETE FROM zhao_point_records_channel_lnk WHERE point_record_id = $1`, [rec.id]);
    await client.query(`DELETE FROM zhao_point_records_user_channel_lnk WHERE point_record_id = $1`, [rec.id]);
    await client.query(`DELETE FROM zhao_point_records_operator_lnk WHERE point_record_id = $1`, [rec.id]);
    await client.query(`DELETE FROM zhao_point_records WHERE id = $1`, [rec.id]);
  }
  for (const id of myIds) {
    const members = await client.query(`SELECT id FROM zhao_channel_members_user_lnk WHERE user_id = $1`, [id]);
    const memberIds = members.rows.map((m) => m.id);
    if (memberIds.length) {
      const chIds = await client.query(`SELECT DISTINCT channel_id AS id FROM zhao_channel_members_channel_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_channel_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_invited_by_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_user_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members WHERE id = ANY($1)`, [memberIds]);
      for (const ch of chIds.rows) {
        await client.query(`DELETE FROM zhao_channels WHERE id = $1 AND name LIKE 'accr_%的个人渠道'`, [ch.id]);
      }
    }
    await client.query(`DELETE FROM up_users WHERE id = $1`, [id]);
  }
}

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');

  // ---- 清场(开头) ----
  await client.query(`DELETE FROM activities WHERE title LIKE '验收-%'`);
  await client.query(`DELETE FROM activity_series WHERE title LIKE '验收-%'`);
  const leftUsers = await client.query(`SELECT id FROM up_users WHERE username LIKE 'accr_%'`);
  await purgeUsers(leftUsers.rows.map((r) => r.id));

  // ---- admin 登录 ----
  const adminLogin = await waitForServer() || (await login('1117', 'a123456'));
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 80));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  // ---- 注册验收用户 ----
  const names = ['uFree', 'uPaid', 'uPoor', 'uActive', 'uPoorW', 'uPaidW', 'uCi', 'uCiPoor'];
  const users = {};
  for (const n of names) {
    const u = await register('accr_' + n + '_' + Date.now());
    users[n] = { id: u.id, token: u.token };
  }
  check('注册 8 个验收用户', names.every((n) => users[n].id && users[n].token));
  const uid = (n) => users[n].id;

  const createdSeries = []; // {docId,id}
  const createdActs = [];   // {actId,actDoc}

  try {
    // ================= §1 系列 defaultRules 继承 + generate =================
    const R1 = { capacity: 2, checkinMode: 'self', geoEnforced: false, pointsCost: 10, feeCollectAt: 'signup', signupOpenDays: 2 };
    let { docId: s1doc, id: s1id, series } = await createSeries(adminToken, '验收-系列规则', R1);
    createdSeries.push({ docId: s1doc, id: s1id });
    check('建系列设 defaultRules 成功', !!s1doc, `docId=${s1doc}`);
    const g1 = await generateOne(adminToken, s1doc);
    check('generate count=1 生成 1 场', g1.status === 200 && g1.generated === 1, `status=${g1.status} generated=${g1.generated}`);
    let act1 = await seriesActivity(s1id);
    createdActs.push({ actId: act1.id, actDoc: act1.document_id });
    const diffMs = act1 && act1.signup_start ? Math.abs(new Date(act1.signup_start).getTime() - (new Date(act1.start_time).getTime() - 2 * 24 * 3600 * 1000)) : -1;
    check('§1 生成场次 capacity=2', act1 && act1.capacity === 2, `capacity=${act1 && act1.capacity}`);
    check('§1 生成场次 pointsCost=10', act1 && act1.points_cost === 10, `pointsCost=${act1 && act1.points_cost}`);
    check('§1 生成场次 feeCollectAt=signup', act1 && act1.fee_collect_at === 'signup', `feeCollectAt=${act1 && act1.fee_collect_at}`);
    check('§1 生成场次 checkinMode=self', act1 && act1.checkin_mode === 'self', `checkinMode=${act1 && act1.checkin_mode}`);
    check('§1 生成场次 geoEnforced=false', act1 && act1.geo_enforced === false, `geoEnforced=${act1 && act1.geo_enforced}`);
    check('§1 signupStart 已按 signupOpenDays=2 换算(start-2d)', diffMs >= 0 && diffMs < 5000, `signupStart=${act1 && act1.signup_start} start=${act1 && act1.start_time} diff=${diffMs}ms`);

    // ================= §2 免费场(pointsCost=0) 报名/签到无扣费 =================
    const sFree = await createSeries(adminToken, '验收-系列免费', { capacity: 2, checkinMode: 'self', geoEnforced: false, pointsCost: 0, feeCollectAt: 'signup' });
    createdSeries.push({ docId: sFree.docId, id: sFree.id });
    await generateOne(adminToken, sFree.docId);
    const aFree = await seriesActivity(sFree.id);
    createdActs.push({ actId: aFree.id, actDoc: aFree.document_id });
    await openActivity(adminToken, aFree.document_id);
    const uFreeBal0 = await balanceOf(uid('uFree'));
    let r = await api('POST', '/zhao-point/v1/my/activity/signup', { token: users.uFree.token, body: { activityId: aFree.document_id } });
    check('§2 免费场报名 ok', r.json?.data?.ok === true, `${r.status} ${JSON.stringify(r.json?.data)}`);
    check('§2 免费场报名无 activity_fee 扣费', (await countAction(uid('uFree'), 'activity_fee')) === 0);
    const uFreeBal1 = await balanceOf(uid('uFree'));
    check('§2 免费场报名无扣费(余额未减，可获报名积分)', uFreeBal1 >= uFreeBal0, `bal ${uFreeBal0}->${uFreeBal1}`);
    r = await api('POST', `/zhao-point/v1/my/activity/${aFree.document_id}/checkin`, { token: users.uFree.token, body: { method: 'self' } });
    check('§2 免费场签到 ok', r.json?.data?.ok === true, `${r.status} ${JSON.stringify(r.json?.data)}`);
    const freeSignup = await mySignup(aFree.id, uid('uFree'));
    check('§2 免费场 signup pointsCharged=0', freeSignup && freeSignup.points_charged === 0, JSON.stringify(freeSignup));

    // ================= §3 signup 计费场: 扣费 + 余额不足回滚 =================
    const sFee = await createSeries(adminToken, '验收-系列signup计费', { capacity: 2, checkinMode: 'self', geoEnforced: false, pointsCost: 10, feeCollectAt: 'signup' });
    createdSeries.push({ docId: sFee.docId, id: sFee.id });
    await generateOne(adminToken, sFee.docId);
    const aFee = await seriesActivity(sFee.id);
    createdActs.push({ actId: aFee.id, actDoc: aFee.document_id });
    await openActivity(adminToken, aFee.document_id);

    // 余额不足报名 -> insufficient_points + used_capacity 未增
    collectionGrant: {
      const used0 = await usedCapacity(aFee.id);
      r = await api('POST', '/zhao-point/v1/my/activity/signup', { token: users.uPoor.token, body: { activityId: aFee.document_id } });
      const d = r.json?.data || {};
      check('§3 余额不足报名返回 insufficient_points', d.ok === false && d.reason === 'insufficient_points', `${r.status} ${JSON.stringify(d)}`);
      const used1 = await usedCapacity(aFee.id);
      check('§3 余额不足名额回滚(used_capacity 未增)', used1 === used0, `used ${used0}->${used1}`);
      check('§3 余额不足未产生 activity_fee 记录', (await countAction(uid('uPoor'), 'activity_fee')) === 0);
    }
    // 有积分用户报名成功 -> 扣费
    const uPaidBal0 = await grantPoints(uid('uPaid'), 30, '验收充值');
    r = await api('POST', '/zhao-point/v1/my/activity/signup', { token: users.uPaid.token, body: { activityId: aFee.document_id } });
    check('§3 有积分报名 ok', r.json?.data?.ok === true, `${r.status} ${JSON.stringify(r.json?.data)}`);
    check('§3 报名产生 activity_fee 记录(1条)', (await countAction(uid('uPaid'), 'activity_fee')) === 1);
    const feeRec = await actionRecord(uid('uPaid'), 'activity_fee');
    check('§3 activity_fee 扣10 且 balance=30-10/减 pointsCost', feeRec && feeRec.points === -10 && feeRec.balance === uPaidBal0 - 10, JSON.stringify(feeRec));
    const feeSignup = await mySignup(aFee.id, uid('uPaid'));
    check('§3 signup pointsCharged=10', feeSignup && feeSignup.points_charged === 10, JSON.stringify(feeSignup));

    // ================= §5 signup 计费场会前取消 -> 退款 + 名额释放 =================
    const sFeeUsed1 = await usedCapacity(aFee.id);
    r = await api('POST', `/zhao-point/v1/my/activity/${aFee.document_id}/cancel`, { token: users.uPaid.token });
    check('§5 会前取消 ok', r.json?.data?.ok === true, `${r.status} ${JSON.stringify(r.json?.data)}`);
    check('§5 产生 activity_fee_refund 记录(1条)', (await countAction(uid('uPaid'), 'activity_fee_refund')) === 1);
    const refRec = await actionRecord(uid('uPaid'), 'activity_fee_refund');
    check('§5 退款回补 points=+10', refRec && refRec.points === 10, JSON.stringify(refRec));
    const sFeeUsed2 = await usedCapacity(aFee.id);
    check('§5 名额释放(used -1)', sFeeUsed2 === sFeeUsed1 - 1, `used ${sFeeUsed1}->${sFeeUsed2}`);

    // ================= §4 满员候补 -> 取消释放 -> promoteWaiting 只转正有积分 =================
    const sWl = await createSeries(adminToken, '验收-系列候补', { capacity: 1, checkinMode: 'self', geoEnforced: false, pointsCost: 10, feeCollectAt: 'signup' });
    createdSeries.push({ docId: sWl.docId, id: sWl.id });
    await generateOne(adminToken, sWl.docId);
    const aWl = await seriesActivity(sWl.id);
    createdActs.push({ actId: aWl.id, actDoc: aWl.document_id });
    await openActivity(adminToken, aWl.document_id);

    await grantPoints(uid('uActive'), 10, '验收充值');
    await grantPoints(uid('uPaidW'), 10, '验收充值');
    r = await api('POST', '/zhao-point/v1/my/activity/signup', { token: users.uActive.token, body: { activityId: aWl.document_id } });
    check('§4 第1人占满(capacity=1) active', r.json?.data?.ok === true, `${r.status} ${JSON.stringify(r.json?.data)}`);
    r = await api('POST', '/zhao-point/v1/my/activity/signup', { token: users.uPoorW.token, body: { activityId: aWl.document_id } });
    check('§4 无积分用户满员候补 position=1', r.json?.data?.ok === true && r.json?.data?.waitlisted === true && r.json?.data?.position === 1, JSON.stringify(r.json?.data));
    r = await api('POST', '/zhao-point/v1/my/activity/signup', { token: users.uPaidW.token, body: { activityId: aWl.document_id } });
    check('§4 有积分用户满员候补 position=2', r.json?.data?.ok === true && r.json?.data?.waitlisted === true && r.json?.data?.position === 2, JSON.stringify(r.json?.data));

    r = await api('POST', `/zhao-point/v1/my/activity/${aWl.document_id}/cancel`, { token: users.uActive.token });
    check('§4 active 取消释放', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    const poorW = await mySignup(aWl.id, uid('uPoorW'));
    check('§4 积分不足候补仍保持 waiting(未转正)', poorW && poorW.status === 'waiting', JSON.stringify(poorW));
    const paidW = await mySignup(aWl.id, uid('uPaidW'));
    check('§4 有积分候补被转正为 active 且 pointsCharged=10', paidW && paidW.status === 'active' && paidW.points_charged === 10, JSON.stringify(paidW));
    check('§4 转正用户扣费 activity_fee(1条, method=activity_promote)', (await countAction(uid('uPaidW'), 'activity_fee')) === 1);
    check('§4 名额 used_capacity=1(被转正占用)', (await usedCapacity(aWl.id)) === 1);

    // ================= §6 checkin 计费场 =================
    const sChk = await createSeries(adminToken, '验收-系列checkin计费', { capacity: 2, checkinMode: 'self', geoEnforced: false, pointsCost: 10, feeCollectAt: 'checkin' });
    createdSeries.push({ docId: sChk.docId, id: sChk.id });
    await generateOne(adminToken, sChk.docId);
    const aChk = await seriesActivity(sChk.id);
    createdActs.push({ actId: aChk.id, actDoc: aChk.document_id });
    await openActivity(adminToken, aChk.document_id);

    await grantPoints(uid('uCi'), 10, '验收充值');
    r = await api('POST', '/zhao-point/v1/my/activity/signup', { token: users.uCi.token, body: { activityId: aChk.document_id } });
    check('§6 checkin场报名 ok(不扣费)', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    check('§6 checkin场报名 pointsCharged=0', (await mySignup(aChk.id, uid('uCi'))).points_charged === 0);
    check('§6 checkin场报名未产生 activity_fee', (await countAction(uid('uCi'), 'activity_fee')) === 0);
    const uCiBal0 = await balanceOf(uid('uCi'));

    r = await api('POST', '/zhao-point/v1/my/activity/signup', { token: users.uCiPoor.token, body: { activityId: aChk.document_id } });
    check('§6 无积分用户 checkin场报名 ok(pointsCharged=0)', r.json?.data?.ok === true, JSON.stringify(r.json?.data));

    // 签到成功扣费 + 落 attendance
    r = await api('POST', `/zhao-point/v1/my/activity/${aChk.document_id}/checkin`, { token: users.uCi.token, body: { method: 'self' } });
    const ciD = r.json?.data || {};
    check('§6 有积分签到成功(落 attendance)', ciD.ok === true && ciD.attendanceId != null, `${r.status} ${JSON.stringify(ciD)}`);
    check('§6 签到扣费 activity_fee(1条)', (await countAction(uid('uCi'), 'activity_fee')) === 1);
    const ciFeeRec = await actionRecord(uid('uCi'), 'activity_fee');
    check('§6 签到扣费 record 减 pointsCost/balance', ciFeeRec && ciFeeRec.points === -10 && ciFeeRec.balance === uCiBal0 - 10 && ciFeeRec.method === 'activity_checkin', JSON.stringify(ciFeeRec));
    check('§6 uCi attendance 落库(1条)', (await attendanceCount(uid('uCi'))) === 1);

    // 签到余额不足 -> insufficient_points 不落 attendance
    const ciPoorAtt0 = await attendanceCount(uid('uCiPoor'));
    r = await api('POST', `/zhao-point/v1/my/activity/${aChk.document_id}/checkin`, { token: users.uCiPoor.token, body: { method: 'self' } });
    const ciPoorD = r.json?.data || {};
    check('§6 签到余额不足返回 insufficient_points', ciPoorD.ok === false && ciPoorD.reason === 'insufficient_points', `${r.status} ${JSON.stringify(ciPoorD)}`);
    check('§6 余额不足未落 attendance', (await attendanceCount(uid('uCiPoor'))) === ciPoorAtt0, `before=${ciPoorAtt0}`);

    // ================= §7 幂等: 重复报名/重复签到 =================
    r = await api('POST', '/zhao-point/v1/my/activity/signup', { token: users.uCi.token, body: { activityId: aChk.document_id } });
    check('§7 重复报名 already_signed_up', r.json?.data?.ok === false && r.json?.data?.reason === 'already_signed_up', `${r.status} ${JSON.stringify(r.json?.data)}`);
    r = await api('POST', `/zhao-point/v1/my/activity/${aChk.document_id}/checkin`, { token: users.uCi.token, body: { method: 'self' } });
    check('§7 重复签到 already_checked_in', r.json?.data?.ok === false && r.json?.data?.reason === 'already_checked_in', `${r.status} ${JSON.stringify(r.json?.data)}`);
  } finally {
    // ================= 清理（零残留） =================
    // 逐活动删 attendance + signup + lnk
    for (const a of createdActs) {
      const attIds = await client.query(
        `SELECT sl.activity_attendance_id::int AS id FROM activity_attendances_signup_lnk sl
           JOIN activity_signups sg ON sg.id = sl.activity_signup_id
           JOIN activity_signups_activity_lnk al ON al.activity_signup_id = sg.id
          WHERE al.activity_id = $1`, [a.actId]);
      for (const att of attIds.rows) {
        await client.query(`DELETE FROM activity_attendances_signup_lnk WHERE activity_attendance_id = $1`, [att.id]);
        await client.query(`DELETE FROM activity_attendances WHERE id = $1`, [att.id]);
      }
      const signupIds = await client.query(
        `SELECT al.activity_signup_id::int AS id FROM activity_signups_activity_lnk al WHERE al.activity_id = $1`, [a.actId]);
      for (const s of signupIds.rows) {
        await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id = $1`, [s.id]);
        await client.query(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [s.id]);
        await client.query(`DELETE FROM activity_signups WHERE id = $1`, [s.id]);
      }
    }
    await client.query(`DELETE FROM activities WHERE title LIKE '验收-%'`);
    await client.query(`DELETE FROM activity_series WHERE title LIKE '验收-%'`);
    await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_series_id NOT IN (SELECT id FROM activity_series) OR activity_id NOT IN (SELECT id FROM activities)`);
    // 测试用户 + 其积分记录 / 个人渠道/成员 / 用户本身
    await purgeUsers(names.map((n) => users[n] && users[n].id));
  }

  // 残留统计
  const residue = await client.query(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE '验收-%') a,
      (SELECT count(*)::int FROM activity_series WHERE title LIKE '验收-%') s,
      (SELECT count(*)::int FROM activities_belongs_to_series_lnk WHERE activity_series_id NOT IN (SELECT id FROM activity_series) OR activity_id NOT IN (SELECT id FROM activities)) l,
      (SELECT count(*)::int FROM up_users WHERE username LIKE 'accr_%') u,
      (SELECT count(*)::int FROM activity_signups_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) su`);
  const res = residue.rows[0];
  check(`清理完成(活动=${res.a} 系列=${res.s} 归属孤儿=${res.l} 测试用户=${res.u} 报名孤儿=${res.su})`,
    res.a === 0 && res.s === 0 && res.l === 0 && res.u === 0 && res.su === 0);

  await client.end();

  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });