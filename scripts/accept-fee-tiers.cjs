/* 系列报名费用分档（tier/factor/flat）验收
 * 用法: cd e:\code\basic && node scripts/accept-fee-tiers.cjs
 * 覆盖:
 *  a) flat 零回归: 免费报名不扣费; 收费报名扣 points_cost 且 feeTierId 为空; 取消退 refund
 *  b) tier 时间窗: order1 早鸟(未来) ↑ order2 全开; 现报命中 order1; 改 order1.end 为过去后新用户落 order2
 *  c) tier 限量满档: quota=1 → 用户A占满 q1, 用户B自动落 q2(feeTierId=q2), q1 不超卖
 *  d) tier 用户类型: segment:S 档优先 + 'all' 兜底; S用户命中 segment:S, C用户命中 all
 *  e) tier 无匹配回退: 所有档时间窗已过 → 落 flat 兜底价 points_cost
 *  f) factor 叠加: base20+window_discount5→15; +segment_discount_percent(S,10%)→14; base1+flat_discount2→max(1)=1
 *  g) 幂等 + 退款凭 pointsCharged + 零残留清理
 *
 * 运行前置: 本地 Strapi develop 已运行(127.0.0.1:1337)且已重编译 zhao-point 与 zhao-sso 插件。
 * 用户构造: zhao-auth 注册生成 up_users(注册自动建个人渠道+channel-member, 满足点服务渠道解析);
 *   段位用户额外 DB 直插 sso_users(同 username 桥接) + sso_user_profiles(segment) + user lnk。
 * 积分注入: 直接写 zhao_point_records(+user/channel lnk, balance=running total), 规避 admin-adjust 的 operator 外键。
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

// ===== 段位用户: 桥接 sso_users + sso_user_profiles(segment) =====
async function setupSsoSegment(upUserUsername, segment) {
  const ins = await client.query(
    `INSERT INTO sso_users (document_id, uuid, username, email, password_hash, status, register_channel, login_count, created_at, updated_at)
     VALUES ($1,$2,$3,$4,'$2b$12$acceptfee','active','accept',0,now(),now()) RETURNING id`,
    [crypto.randomUUID(), crypto.randomUUID(), upUserUsername, `${upUserUsername}@audit.local`]);
  const ssoId = ins.rows[0].id;
  const prof = await client.query(
    `INSERT INTO sso_user_profiles (document_id, segment, segment_score, created_at, updated_at)
     VALUES ($1,$2,0,now(),now()) RETURNING id`, [crypto.randomUUID(), segment]);
  await client.query(`INSERT INTO sso_user_profiles_user_lnk (sso_user_profile_id, sso_user_id) VALUES ($1,$2)`,
    [prof.rows[0].id, ssoId]);
  return ssoId;
}

// ===== 活动(直接插库)与计费断言辅助 =====
async function insertActivity({ title, pointsCost = 0, feeCollectAt = 'signup', pricingMode = 'flat', feeTiers = [], feeFactors = {} }) {
  const docId = crypto.randomUUID();
  const now = Date.now();
  const ins = await client.query(
    `INSERT INTO activities (document_id,title,description,start_time,end_time,venue_name,capacity,used_capacity,signup_start,signup_end,checkin_mode,geo_enforced,status,channel_scope,points_cost,fee_collect_at,pricing_mode,fee_tiers,fee_factors,created_at,updated_at)
     VALUES ($1,$2,'验收分档',$3,$4,'验收场地',10,0,$5,$6,'self',false,'signup_open','all',$7,$8,$9,$10::jsonb,$11::jsonb,now(),now()) RETURNING id`,
    [docId, title, new Date(now + 86400e3), new Date(now + 2 * 86400e3),
     new Date(now - 3600e3), new Date(now + 72 * 3600e3),
     pointsCost, feeCollectAt, pricingMode, JSON.stringify(feeTiers), JSON.stringify(feeFactors)]);
  return { docId, id: ins.rows[0].id };
}

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
  await client.query(`INSERT INTO zhao_point_records_user_lnk (point_record_id, user_id) VALUES ($1, $2)`,
    [ins.rows[0].id, userId]);
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
async function mySignup(actId, userId) {
  const r = await client.query(
    `SELECT s.status, s.points_charged, s.fee_tier_id FROM activity_signups s
       JOIN activity_signups_activity_lnk al ON al.activity_signup_id = s.id
       JOIN activity_signups_user_lnk ul ON ul.activity_signup_id = s.id
      WHERE al.activity_id = $1 AND ul.user_id = $2`, [actId, userId]);
  return r.rows[0] || null;
}
async function tierActiveCount(actId, tierId) {
  const r = await client.query(
    `SELECT count(*)::int n FROM activity_signups s
       JOIN activity_signups_activity_lnk al ON al.activity_signup_id = s.id
      WHERE al.activity_id = $1 AND s.fee_tier_id = $2 AND s.status = 'active'`, [actId, tierId]);
  return r.rows[0].n;
}

// ===== 清理: 测试用户(积分/渠道/成员/用户本身) + 段位 sso =====
async function purgeUsers(ids) {
  const myIds = [...new Set((ids || []).filter(Boolean))];
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
  }
  // sso 桥接(accr_%): 消息任务/画像/登录日志/token 关联后删主表
  const ssoIds = (await client.query(`SELECT id FROM sso_users WHERE username LIKE 'accr_%'`)).rows.map((r) => r.id);
  if (ssoIds.length) {
    const jobIds = (await client.query(`SELECT DISTINCT msg_job_id AS id FROM sso_msg_jobs_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds])).rows.map((r) => r.id);
    const profIds = (await client.query(`SELECT DISTINCT sso_user_profile_id AS id FROM sso_user_profiles_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds])).rows.map((r) => r.id);
    const tokIds = (await client.query(`SELECT DISTINCT sso_token_id AS id FROM sso_tokens_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds])).rows.map((r) => r.id);
    const logIds = (await client.query(`SELECT DISTINCT sso_login_log_id AS id FROM sso_login_logs_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds])).rows.map((r) => r.id);
    await client.query(`DELETE FROM sso_msg_jobs_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds]);
    if (jobIds.length) await client.query(`DELETE FROM sso_msg_jobs WHERE id = ANY($1)`, [jobIds]);
    await client.query(`DELETE FROM sso_user_profiles_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds]);
    if (profIds.length) await client.query(`DELETE FROM sso_user_profiles WHERE id = ANY($1)`, [profIds]);
    await client.query(`DELETE FROM sso_tokens_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds]);
    if (tokIds.length) await client.query(`DELETE FROM sso_tokens WHERE id = ANY($1)`, [tokIds]);
    await client.query(`DELETE FROM sso_login_logs_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds]);
    if (logIds.length) await client.query(`DELETE FROM sso_login_logs WHERE id = ANY($1)`, [logIds]);
    await client.query(`DELETE FROM sso_users WHERE id = ANY($1)`, [ssoIds]);
  }
  if (myIds.length) await client.query(`DELETE FROM up_users WHERE id = ANY($1)`, [myIds]);
}

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');

  // ---- 清场(开头) ----
  await client.query(`DELETE FROM activities WHERE title LIKE '验收-%'`);
  const leftUsers = await client.query(`SELECT id FROM up_users WHERE username LIKE 'accr_%'`);
  await purgeUsers(leftUsers.rows.map((r) => r.id));

  // ---- admin 登录 ----
  const adminLogin = await waitForServer() || (await login('1117', 'a123456'));
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 80));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  // ---- 注册验收用户 ----
  const names = ['uFf', 'uFp', 'uTw1', 'uTw2', 'uAq', 'uBq', 'uSegS', 'uSegC', 'uFall', 'uF1', 'uFseg', 'uFmin', 'uIdem'];
  const users = {};
  for (const n of names) {
    const u = await register('accr_' + n + '_' + Date.now() + '_' + Math.floor(Math.random() * 1e6));
    users[n] = { id: u.id, token: u.token };
  }
  check('注册 13 个验收用户', names.every((n) => users[n] && users[n].id && users[n].token));
  const uid = (n) => users[n] && users[n].id;

  // 段位用户: 桥接 sso(segment) 供 resolveUserProfile 命中 (按 username 匹配)
  const segUsers = { uSegS: 'S', uSegC: 'C', uFseg: 'S' };
  for (const [key] of Object.entries(segUsers)) {
    const real = await client.query(`SELECT username FROM up_users WHERE id=$1`, [uid(key)]);
    await setupSsoSegment(real.rows[0].username, segUsers[key]);
  }

  const createdActs = []; // {id, docId}
  const addAct = (a) => { createdActs.push(a); return a; };
  const signup = (actDoc, user) => api('POST', '/zhao-point/v1/my/activity/signup', { token: user.token, body: { activityId: actDoc } });
  const checkin = (actDoc, user) => api('POST', `/zhao-point/v1/my/activity/${actDoc}/checkin`, { token: user.token, body: { method: 'self' } });
  const cancel = (actDoc, user) => api('POST', `/zhao-point/v1/my/activity/${actDoc}/cancel`, { token: user.token });

  try {
    // ================= a) flat 零回归 =================
    const aFree = addAct(await insertActivity({ title: '验收-档flat免费', pointsCost: 0 }));
    let r = await signup(aFree.docId, users.uFf);
    check('a 免费展开报名 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    check('a 免费报名无 activity_fee 扣费', (await countAction(uid('uFf'), 'activity_fee')) === 0);
    let sFree = await mySignup(aFree.id, uid('uFf'));
    check('a 免费报名 pointsCharged=0 且 feeTierId=null', sFree && sFree.points_charged === 0 && sFree.fee_tier_id === null, JSON.stringify(sFree));

    const aPf = addAct(await insertActivity({ title: '验收-档flat收费', pointsCost: 20 }));
    const upPf0 = await grantPoints(uid('uFp'), 30, '验收充值');
    r = await signup(aPf.docId, users.uFp);
    check('a 收费 flat 报名 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    check('a 收费报名 activity_fee(1条)', (await countAction(uid('uFp'), 'activity_fee')) === 1);
    let sPf = await mySignup(aPf.id, uid('uFp'));
    check('a 收费报名 pointsCharged=20 且 feeTierId=null', sPf && sPf.points_charged === 20 && sPf.fee_tier_id === null, JSON.stringify(sPf));
    const feeRec = await actionRecord(uid('uFp'), 'activity_fee');
    check('a 收费 flat 扣20 balance=30-20', feeRec && feeRec.points === -20 && feeRec.balance === upPf0 - 20, JSON.stringify(feeRec));
    r = await cancel(aPf.docId, users.uFp);
    check('a 收费 flat 取消 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    check('a 取消产生 refund(1条)', (await countAction(uid('uFp'), 'activity_fee_refund')) === 1);
    const refRec = await actionRecord(uid('uFp'), 'activity_fee_refund');
    check('a 退款 points=+20', refRec && refRec.points === 20, JSON.stringify(refRec));

    // ================= b) tier 时间窗 =================
    const nowTs = Date.now();
    const tw = addAct(await insertActivity({
      title: '验收-档tier时间窗', pointsCost: 100, feeCollectAt: 'signup', pricingMode: 'tier',
      feeTiers: [
        { id: 't1', order: 1, pointsCost: 10, window: { start: new Date(nowTs - 3600e3).toISOString(), end: new Date(nowTs + 2 * 3600e3).toISOString() } },
        { id: 't2', order: 2, pointsCost: 50, window: { start: new Date(nowTs - 3600e3).toISOString(), end: null } },
      ],
    }));
    await grantPoints(uid('uTw1'), 30, '验收充值');
    r = await signup(tw.docId, users.uTw1);
    check('b 早鸟窗内报名 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    let sTw1 = await mySignup(tw.id, uid('uTw1'));
    check('b 现报命中 order1(价10, feeTierId=t1)', sTw1 && sTw1.points_charged === 10 && sTw1.fee_tier_id === 't1', JSON.stringify(sTw1));
    const tw1Fee = await actionRecord(uid('uTw1'), 'activity_fee');
    check('b order1 落账 activity_fee=-10', tw1Fee && tw1Fee.points === -10, JSON.stringify(tw1Fee));
    await grantPoints(uid('uTw2'), 60, '验收充值');
    // 手动把 order1 window.end 改为过去
    await client.query(`UPDATE activities SET fee_tiers=$1 WHERE id=$2`, [
      JSON.stringify([
        { id: 't1', order: 1, pointsCost: 10, window: { start: new Date(nowTs - 2 * 3600e3).toISOString(), end: new Date(nowTs - 60e3).toISOString() } },
        { id: 't2', order: 2, pointsCost: 50, window: { start: new Date(nowTs - 3600e3).toISOString(), end: null } },
      ]), tw.id]);
    r = await signup(tw.docId, users.uTw2);
    check('b 修改窗后新用户报名 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    let sTw2 = await mySignup(tw.id, uid('uTw2'));
    check('b 新用户落 order2(价50, feeTierId=t2)', sTw2 && sTw2.points_charged === 50 && sTw2.fee_tier_id === 't2', JSON.stringify(sTw2));
    const tw2Fee = await actionRecord(uid('uTw2'), 'activity_fee');
    check('b order2 落账 activity_fee=-50', tw2Fee && tw2Fee.points === -50, JSON.stringify(tw2Fee));

    // ================= c) tier 限量满档 =================
    const q = addAct(await insertActivity({
      title: '验收-档tier限量', pointsCost: 100, feeCollectAt: 'signup', pricingMode: 'tier',
      feeTiers: [
        { id: 'q1', order: 1, pointsCost: 10, quota: 1, window: { end: null } },
        { id: 'q2', order: 2, pointsCost: 20, quota: 2, window: { end: null } },
      ],
    }));
    await grantPoints(uid('uAq'), 30, '验收充值');
    r = await signup(q.docId, users.uAq);
    check('c 用户A占满 q1 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    let sAq = await mySignup(q.id, uid('uAq'));
    check('c A 命中 q1(价10, feeTierId=q1)', sAq && sAq.points_charged === 10 && sAq.fee_tier_id === 'q1', JSON.stringify(sAq));
    await grantPoints(uid('uBq'), 30, '验收充值');
    r = await signup(q.docId, users.uBq);
    check('c 用户B报名 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    let sBq = await mySignup(q.id, uid('uBq'));
    check('c B 自动落 q2(价20, feeTierId=q2)', sBq && sBq.points_charged === 20 && sBq.fee_tier_id === 'q2', JSON.stringify(sBq));
    check('c q1 不超卖(active=q1 仅1人)', (await tierActiveCount(q.id, 'q1')) === 1, `q1count=${await tierActiveCount(q.id, 'q1')}`);
    check('c q2 被 B 占用(active=q2=1)', (await tierActiveCount(q.id, 'q2')) === 1);

    // ================= d) tier 用户类型 =================
    const ut = addAct(await insertActivity({
      title: '验收-档tier用户类型', pointsCost: 100, feeCollectAt: 'signup', pricingMode: 'tier',
      feeTiers: [
        { id: 'segS', order: 1, pointsCost: 30, userType: 'segment:S', window: { end: null } },
        { id: 'all1', order: 2, pointsCost: 60, userType: 'all', window: { end: null } },
      ],
    }));
    await grantPoints(uid('uSegS'), 60, '验收充值');
    r = await signup(ut.docId, users.uSegS);
    check('d S用户报名 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    let sSegS = await mySignup(ut.id, uid('uSegS'));
    check('d S 命中 segment:S(价30, feeTierId=segS)', sSegS && sSegS.points_charged === 30 && sSegS.fee_tier_id === 'segS', JSON.stringify(sSegS));
    await grantPoints(uid('uSegC'), 60, '验收充值');
    r = await signup(ut.docId, users.uSegC);
    check('d C用户报名 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    let sSegC = await mySignup(ut.id, uid('uSegC'));
    check('d C 兜底 all(价60, feeTierId=all1)', sSegC && sSegC.points_charged === 60 && sSegC.fee_tier_id === 'all1', JSON.stringify(sSegC));

    // ================= e) tier 无匹配回退 =================
    const eb = addAct(await insertActivity({
      title: '验收-档tier回退', pointsCost: 88, feeCollectAt: 'signup', pricingMode: 'tier',
      feeTiers: [
        { id: 'w1', order: 1, pointsCost: 10, window: { start: new Date(nowTs - 2 * 3600e3).toISOString(), end: new Date(nowTs - 3600e3).toISOString() } },
        { id: 'w2', order: 2, pointsCost: 20, window: { start: new Date(nowTs - 2 * 3600e3).toISOString(), end: new Date(nowTs - 3600e3).toISOString() } },
      ],
    }));
    await grantPoints(uid('uFall'), 100, '验收充值');
    r = await signup(eb.docId, users.uFall);
    check('e 全档过期报名 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    let sFall = await mySignup(eb.id, uid('uFall'));
    check('e 落 flat 兜底价(88, feeTierId=null)', sFall && sFall.points_charged === 88 && sFall.fee_tier_id === null, JSON.stringify(sFall));
    const fallFee = await actionRecord(uid('uFall'), 'activity_fee');
    check('e 兜底扣88', fallFee && fallFee.points === -88, JSON.stringify(fallFee));

    // ================= f) factor 叠加 =================
    const fw = addAct(await insertActivity({
      title: '验收-档factor窗折', pointsCost: 100, feeCollectAt: 'signup', pricingMode: 'factor',
      feeFactors: { base: 20, factors: [{ type: 'window_discount', until: new Date(nowTs + 24 * 3600e3).toISOString(), amount: 5 }] },
    }));
    await grantPoints(uid('uF1'), 20, '验收充值');
    r = await signup(fw.docId, users.uF1);
    let sF1 = await mySignup(fw.id, uid('uF1'));
    check('f base20+window_discount5 → 现价15', r.json?.data?.ok === true && sF1 && sF1.points_charged === 15, `${JSON.stringify(r.json?.data)} signup=${JSON.stringify(sF1)}`);

    const fs = addAct(await insertActivity({
      title: '验收-档factor段折', pointsCost: 100, feeCollectAt: 'signup', pricingMode: 'factor',
      feeFactors: {
        base: 20,
        factors: [
          { type: 'window_discount', until: new Date(nowTs + 24 * 3600e3).toISOString(), amount: 5 },
          { type: 'segment_discount_percent', minSegment: 'S', percent: 10 },
        ],
      },
    }));
    await grantPoints(uid('uFseg'), 20, '验收充值');
    r = await signup(fs.docId, users.uFseg);
    let sFseg = await mySignup(fs.id, uid('uFseg'));
    check('f S用户 15*0.9=13.5 → 14', r.json?.data?.ok === true && sFseg && sFseg.points_charged === 14, `${JSON.stringify(r.json?.data)} signup=${JSON.stringify(sFseg)}`);

    const fm = addAct(await insertActivity({
      title: '验收-档factor下限', pointsCost: 100, feeCollectAt: 'signup', pricingMode: 'factor',
      feeFactors: { base: 1, factors: [{ type: 'flat_discount_amount', amount: 2 }] },
    }));
    await grantPoints(uid('uFmin'), 1, '验收充值');
    r = await signup(fm.docId, users.uFmin);
    let sFmin = await mySignup(fm.id, uid('uFmin'));
    check('f base1+flat_discount2 → max(1,-1)=1', r.json?.data?.ok === true && sFmin && sFmin.points_charged === 1, `${JSON.stringify(r.json?.data)} signup=${JSON.stringify(sFmin)}`);

    // ================= g) 幂等 + 退款凭 pointsCharged =================
    const gf = addAct(await insertActivity({ title: '验收-幂等退款', pointsCost: 15 }));
    await grantPoints(uid('uIdem'), 30, '验收充值');
    r = await signup(gf.docId, users.uIdem);
    check('g 报名 ok 扣15', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    r = await signup(gf.docId, users.uIdem);
    check('g 重复报名 already_signed_up', r.json?.data?.ok === false && r.json?.data?.reason === 'already_signed_up', JSON.stringify(r.json?.data));
    r = await checkin(gf.docId, users.uIdem);
    check('g 签到 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    r = await checkin(gf.docId, users.uIdem);
    check('g 重复签到 already_checked_in', r.json?.data?.ok === false && r.json?.data?.reason === 'already_checked_in', JSON.stringify(r.json?.data));
    r = await cancel(gf.docId, users.uIdem);
    check('g 取消 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    const idemRef = await actionRecord(uid('uIdem'), 'activity_fee_refund');
    check('g 退款凭 pointsCharged(=15)', idemRef && idemRef.points === 15, JSON.stringify(idemRef));
  } finally {
    // ================= 清理（零残留） =================
    for (const a of createdActs) {
      const attIds = await client.query(
        `SELECT sl.activity_attendance_id::int AS id FROM activity_attendances_signup_lnk sl
           JOIN activity_signups sg ON sg.id = sl.activity_signup_id
           JOIN activity_signups_activity_lnk al ON al.activity_signup_id = sg.id
          WHERE al.activity_id = $1`, [a.id]);
      for (const att of attIds.rows) {
        await client.query(`DELETE FROM activity_attendances_signup_lnk WHERE activity_attendance_id = $1`, [att.id]);
        await client.query(`DELETE FROM activity_attendances WHERE id = $1`, [att.id]);
      }
      const signupIds = await client.query(`SELECT al.activity_signup_id::int AS id FROM activity_signups_activity_lnk al WHERE al.activity_id = $1`, [a.id]);
      for (const s of signupIds.rows) {
        await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id = $1`, [s.id]);
        await client.query(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [s.id]);
        await client.query(`DELETE FROM activity_signups WHERE id = $1`, [s.id]);
      }
    }
    await client.query(`DELETE FROM activities WHERE title LIKE '验收-%'`);
    await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)`);
    await purgeUsers(names.map((n) => users[n] && users[n].id));
  }

  // 残留统计
  const residue = await client.query(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE '验收-%') a,
      (SELECT count(*)::int FROM activity_signups_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) su,
      (SELECT count(*)::int FROM up_users WHERE username LIKE 'accr_%') u,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE 'accr_%') s,
      (SELECT count(*)::int FROM zhao_point_records_user_lnk ul JOIN up_users uu ON uu.id = ul.user_id WHERE uu.username LIKE 'accr_%') pl`);
  const res = residue.rows[0];
  check(`清理完成(活动=${res.a} 报名孤儿=${res.su} 测试用户=${res.u} sso用户=${res.s} 积分记录=${res.pl})`,
    res.a === 0 && res.su === 0 && res.u === 0 && res.s === 0 && res.pl === 0);

  await client.end();

  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });