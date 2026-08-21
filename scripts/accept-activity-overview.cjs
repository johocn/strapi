/* 活动效果总览看板 验收
 * 用法: cd e:\code\basic && node scripts/accept-activity-overview.cjs
 * 覆盖:
 *  1. 汇总卡片: activityCount/signupCount/attendedCount/attendanceRate/reviewCount/avgRating/avgNps/
 *     pointsChargedSum/referralPoints/referralCount/attendPointsGlobal
 *  2. series 行聚合其场次(报名/到场/评价/裂变), detail 场次级
 *  3. 无系列活动独立成行, detail 含 reviews/referrers/signups(+signupTotal)
 *  4. status 过滤: draft 仅在 all 时出现, signup_open 过滤掉 ended/draft
 *  5. attendanceRate 计算正确, 评分/NPS 仅计已评价(reviewedAt 非空)
 *  6. 零残留
 * 运行前置: 本地 Strapi develop(127.0.0.1:1337)已运行且 zhao-point 已重编译(accept 前先 npm run build)
 */
const { Client } = require('pg');
const crypto = require('crypto');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'aov_'; // 测试用户名前缀

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

  // ---- 清场(开头): 验收活动/系列/报名/奖励/点记录/测试用户 ----
  const acts = await q(`SELECT id FROM activities WHERE title LIKE '验收-%'`);
  for (const a of acts) {
    await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_id = $1`, [a.id]);
    await client.query(`DELETE FROM activity_referral_rewards_activity_lnk WHERE activity_id = $1`, [a.id]);
    const ss = await q(`SELECT activity_signup_id::int AS id FROM activity_signups_activity_lnk WHERE activity_id = $1`, [a.id]);
    for (const s of ss) {
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
  await client.query(`DELETE FROM activity_series WHERE title LIKE '验收-%'`);
  // 测试用户 + 其积分记录/渠道成员
  const upRows = await q(`SELECT id FROM up_users WHERE username LIKE '${PF}%'`);
  for (const u of upRows) {
    const recIds = await q(`SELECT point_record_id::int AS id FROM zhao_point_records_user_lnk WHERE user_id = $1`, [u.id]);
    for (const r of recIds) {
      await client.query(`DELETE FROM zhao_point_records_user_lnk WHERE point_record_id = $1`, [r.id]);
      await client.query(`DELETE FROM zhao_point_records_user_channel_lnk WHERE point_record_id = $1`, [r.id]);
      await client.query(`DELETE FROM zhao_point_records WHERE id = $1`, [r.id]);
    }
    const members = await q(`SELECT id FROM zhao_channel_members_user_lnk WHERE user_id = $1`, [u.id]);
    const memberIds = members.map((m) => m.id);
    if (memberIds.length) {
      const chIds = await q(`SELECT DISTINCT channel_id AS id FROM zhao_channel_members_channel_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_channel_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_invited_by_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_user_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members WHERE id = ANY($1)`, [memberIds]);
      for (const ch of chIds) await client.query(`DELETE FROM zhao_channels WHERE id = $1 AND (name LIKE '${PF}%的个人渠道')`, [ch.id]);
    }
    await client.query(`DELETE FROM up_users WHERE id = $1`, [u.id]);
  }

  // ---- admin 登录 ----
  const adminLogin = await waitForServer();
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 80));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  const createdActs = [];
  const addAct = (a) => { createdActs.push(a); return a; };

  // ---- 测试用户 ----
  const users = {};
  for (const k of ['u1', 'u2', 'u3', 'u4']) {
    const u = await register(nm(k));
    users[k] = { id: u.id };
    check(`注册测试用户 ${k}`, !!u.id, `id=${u.id}`);
  }

  // ---- 构造活动 ----
  // 1 系列(2 场: 已结束 sf1 + 报名中 sf2)
  const seriesRes = await api('POST', '/zhao-point/v1/admin/adm/series', {
    token: adminToken,
    body: { title: '验收-看板系列', description: '系列' },
  });
  const series = seriesRes.json && seriesRes.json.data;
  const seriesDocId = series && series.documentId;
  check('建系列成功', seriesRes.status === 200 && !!seriesDocId, JSON.stringify(series));

  const mkAct = (title, status, startOffsetDays, belongsToSeries) => api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: {
      title, description: title, capacity: 100, status,
      startTime: new Date(Date.now() + startOffsetDays * 86400e3).toISOString(),
      endTime: new Date(Date.now() + (startOffsetDays + 1) * 86400e3).toISOString(),
      ...(belongsToSeries ? { belongsToSeries: belongsToSeries } : {}),
    },
  });

  const sf1 = addAct((await mkAct('验收-看板场次1', 'ended', -2, seriesDocId)).json?.data);
  const sf2 = addAct((await mkAct('验收-看板场次2', 'signup_open', 2, seriesDocId)).json?.data);
  const a1 = addAct((await mkAct('验收-看板活动A', 'ended', -3)).json?.data);
  const a2 = addAct((await mkAct('验收-看板活动B', 'signup_open', 5)).json?.data);
  const d1 = addAct((await mkAct('验收-看板草稿', 'draft', 10)).json?.data);
  const actIds = createdActs.map((a) => a.id);
  check('建 5 个活动(含系列2场+2独立+1草稿)', actIds.length === 5 && actIds.every(Boolean), `ids=${actIds.length}`);

  // ---- 直插报名 ----
  const insSignup = async (actId, uid, { status = 'active', attended = false, rating = null, nps = null, review = null, reviewedAt = false, points = 0 } = {}) => {
    const sig = await client.query(
      `INSERT INTO activity_signups (document_id,status,points_charged,signup_at,attended_at,rating,nps,review,reviewed_at,created_at,updated_at)
       VALUES ($1,$2,$3,now(),$4,$5,$6,$7,$8,now(),now()) RETURNING id`,
      [crypto.randomUUID(), status, points, attended ? new Date().toISOString() : null, rating, nps, review, reviewedAt ? new Date().toISOString() : null]);
    await client.query(`INSERT INTO activity_signups_activity_lnk (activity_signup_id,activity_id) VALUES ($1,$2)`, [sig.rows[0].id, actId]);
    await client.query(`INSERT INTO activity_signups_user_lnk (activity_signup_id,user_id) VALUES ($1,$2)`, [sig.rows[0].id, uid]);
    return sig.rows[0].id;
  };
  // sf1(ended): u1 active 到场+评价100分; u2 waiting; u3 cancelled
  await insSignup(sf1.id, users.u1.id, { attended: true, rating: 5, nps: 9, review: '好', reviewedAt: true, points: 100 });
  await insSignup(sf1.id, users.u2.id, { status: 'waiting' });
  await insSignup(sf1.id, users.u3.id, { status: 'cancelled' });
  // sf2(signup_open): u4 active 到场; u1 active 未到场
  await insSignup(sf2.id, users.u4.id, { attended: true });
  await insSignup(sf2.id, users.u1.id, {});
  // a1(ended): u1 active 到场+评价50分; u2 active 未到场50分; u3 waiting
  await insSignup(a1.id, users.u1.id, { attended: true, rating: 4, nps: 8, review: '不错', reviewedAt: true, points: 50 });
  await insSignup(a1.id, users.u2.id, { points: 50 });
  await insSignup(a1.id, users.u3.id, { status: 'waiting' });
  // a2(signup_open): u3 active 未到场
  await insSignup(a2.id, users.u3.id, {});
  // d1(draft): u4 active 未到场
  await insSignup(d1.id, users.u4.id, {});

  // ---- 直插裂变奖励 ----
  const insReward = async (actId, inviterUid, inviteeUid, points) => {
    const rw = await client.query(
      `INSERT INTO activity_referral_rewards (document_id,points,source_invite_code,issued_at,created_at,updated_at)
       VALUES ($1,$2,'aov-code',now(),now(),now()) RETURNING id`,
      [crypto.randomUUID(), points]);
    await client.query(`INSERT INTO activity_referral_rewards_activity_lnk (activity_referral_reward_id,activity_id) VALUES ($1,$2)`, [rw.rows[0].id, actId]);
    await client.query(`INSERT INTO activity_referral_rewards_inviter_lnk (activity_referral_reward_id,user_id) VALUES ($1,$2)`, [rw.rows[0].id, inviterUid]);
    await client.query(`INSERT INTO activity_referral_rewards_invitee_lnk (activity_referral_reward_id,user_id) VALUES ($1,$2)`, [rw.rows[0].id, inviteeUid]);
    return rw.rows[0].id;
  };
  // sf1: 1 条 50(A 带); a1: A 带 2 条 30+30, B 带 1 条 20
  await insReward(sf1.id, users.u1.id, users.u2.id, 50);
  await insReward(a1.id, users.u1.id, users.u3.id, 30);
  await insReward(a1.id, users.u1.id, users.u4.id, 30);
  await insReward(a1.id, users.u2.id, users.u3.id, 20);

  // ---- 直插签到发放积分(全局) ----
  const pr = await client.query(
    `INSERT INTO zhao_point_records (document_id,action,type,points,balance,source,method,remark,created_at,updated_at)
     VALUES ($1,'activity_attend','increase',25,25,'activity','activity_attend','验收',now(),now()) RETURNING id`,
    [crypto.randomUUID()]);
  await client.query(`INSERT INTO zhao_point_records_user_lnk (point_record_id,user_id) VALUES ($1,$2)`, [pr.rows[0].id, users.u1.id]);

  // ---- 断言: status=all ----
  const ov = await api('GET', '/zhao-point/v1/admin/adm/activity-overview?status=all', { token: adminToken });
  const d = ov.json && ov.json.data;
  check('overview 端点 200 且返回 data.summary/rows', ov.status === 200 && d && d.summary && Array.isArray(d.rows), `${ov.status} ${JSON.stringify(ov.json).slice(0, 100)}`);
  if (!d) { console.error('overview 无数据，终止'); process.exit(1); }
  const s = d.summary;
  // 汇总(精确): activityCount=5, signup=7(1+2+2+1+1), attended=3(1+1+1), rate=3/7=42.86,
  //   review=2, avgRating=(5+4)/2=4.5, avgNps=(9+8)/2=8.5, points=200(100+0+100+0+0),
  //   referralCount=3(1+2), referralPoints=130(50+30+30+20), attend=25
  check('summary.activityCount=5', s.activityCount === 5, `v=${s.activityCount}`);
  check('summary.signupCount=7', s.signupCount === 7, `v=${s.signupCount}`);
  check('summary.attendedCount=3', s.attendedCount === 3, `v=${s.attendedCount}`);
  check('summary.attendanceRate=42.86', s.attendanceRate === 42.86, `v=${s.attendanceRate}`);
  check('summary.reviewCount=2', s.reviewCount === 2, `v=${s.reviewCount}`);
  check('summary.avgRating=4.5', s.avgRating === 4.5, `v=${s.avgRating}`);
  check('summary.avgNps=8.5', s.avgNps === 8.5, `v=${s.avgNps}`);
  check('summary.pointsChargedSum=200', s.pointsChargedSum === 200, `v=${s.pointsChargedSum}`);
  check('summary.referralCount=4', s.referralCount === 4, `v=${s.referralCount}`);
  check('summary.referralPoints=130', s.referralPoints === 130, `v=${s.referralPoints}`);
  check('summary.attendPointsGlobal=25', s.attendPointsGlobal === 25, `v=${s.attendPointsGlobal}`);

  // ---- 断言: rows 结构 ----
  const rows = d.rows;
  const seriesRow = rows.find((r) => r.type === 'series');
  const a1Row = rows.find((r) => r.type === 'activity' && r.documentId === a1.documentId);
  const a2Row = rows.find((r) => r.type === 'activity' && r.documentId === a2.documentId);
  const d1Row = rows.find((r) => r.type === 'activity' && r.documentId === d1.documentId);
  check('rows 含 1 系列 + 3 活动(草稿含)', seriesRow && a1Row && a2Row && d1Row && rows.length === 4, `len=${rows.length}`);
  // series 行聚合两场: signup=3(1+2), attended=2(1+1), rate=66.67, waiting=1, cancelled=1, review=1, avgRating=5, avgNps=9, points=100, referralCount=1, referralPoints=50
  check('series 行 signupCount=3', seriesRow.signupCount === 3, `v=${seriesRow.signupCount}`);
  check('series 行 attendedCount=2', seriesRow.attendedCount === 2, `v=${seriesRow.attendedCount}`);
  check('series 行 attendanceRate=66.67', seriesRow.attendanceRate === 66.67, `v=${seriesRow.attendanceRate}`);
  check('series 行 waitingCount=1 cancelledCount=1', seriesRow.waitingCount === 1 && seriesRow.cancelledCount === 1, `w=${seriesRow.waitingCount} c=${seriesRow.cancelledCount}`);
  check('series 行 reviewCount=1 avgRating=5 avgNps=9', seriesRow.reviewCount === 1 && seriesRow.avgRating === 5 && seriesRow.avgNps === 9, JSON.stringify(seriesRow));
  check('series 行 pointsChargedSum=100', seriesRow.pointsChargedSum === 100, `v=${seriesRow.pointsChargedSum}`);
  check('series 行 referralCount=1 referralPoints=50', seriesRow.referralCount === 1 && seriesRow.referralPoints === 50, `c=${seriesRow.referralCount} p=${seriesRow.referralPoints}`);
  check('series 行 detail 场次级=2', Array.isArray(seriesRow.detail) && seriesRow.detail.length === 2, `len=${seriesRow.detail && seriesRow.detail.length}`);
  const sd0 = seriesRow.detail.find((x) => x.documentId === sf1.documentId);
  const sd1 = seriesRow.detail.find((x) => x.documentId === sf2.documentId);
  check('series detail 场次1: signup=1 attended=1 review=1 rating=5', sd0 && sd0.signupCount === 1 && sd0.attendedCount === 1 && sd0.reviewCount === 1 && sd0.avgRating === 5, JSON.stringify(sd0));
  check('series detail 场次2: signup=2 attended=1 review=0', sd1 && sd1.signupCount === 2 && sd1.attendedCount === 1 && sd1.reviewCount === 0, JSON.stringify(sd1));
  // a1 行: signup=2, attended=1, rate=50, waiting=1, review=1, rating=4 nps=8, points=100, referralCount=3 referralPoints=80
  check('a1 行 signupCount=2 attendedCount=1 rate=50', a1Row.signupCount === 2 && a1Row.attendedCount === 1 && a1Row.attendanceRate === 50, JSON.stringify(a1Row));
  check('a1 行 reviewCount=1 avgRating=4 avgNps=8', a1Row.reviewCount === 1 && a1Row.avgRating === 4 && a1Row.avgNps === 8, JSON.stringify(a1Row));
  check('a1 行 pointsChargedSum=100', a1Row.pointsChargedSum === 100, `v=${a1Row.pointsChargedSum}`);
  check('a1 行 referralCount=3 referralPoints=80', a1Row.referralCount === 3 && a1Row.referralPoints === 80, `c=${a1Row.referralCount} p=${a1Row.referralPoints}`);
  // a1 detail
  check('a1 detail.reviews 长度=1 且含 userName/rating/nps/review/reviewedAt',
    a1Row.detail.reviews.length === 1 && !!a1Row.detail.reviews[0].userName && a1Row.detail.reviews[0].rating === 4 && a1Row.detail.reviews[0].nps === 8 && a1Row.detail.reviews[0].review === '不错' && !!a1Row.detail.reviews[0].reviewedAt, JSON.stringify(a1Row.detail.reviews));
  check('a1 detail.referrers 按 inviter 聚合=2 且 inviteeCount/points 正确',
    a1Row.detail.referrers.length === 2 && a1Row.detail.referrers.some((x) => x.inviteeCount === 2 && x.points === 60) && a1Row.detail.referrers.some((x) => x.inviteeCount === 1 && x.points === 20), JSON.stringify(a1Row.detail.referrers));
  check('a1 detail.signups 长度=2 且含 status/attendedAt', a1Row.detail.signups.length === 2 && a1Row.detail.signupTotal === 2 && a1Row.detail.signups.every((x) => !!x.userName && x.status === 'active'), JSON.stringify(a1Row.detail.signups));
  check('a2 行 signupCount=1 attendedCount=0 rate=0', a2Row.signupCount === 1 && a2Row.attendedCount === 0 && a2Row.attendanceRate === 0, JSON.stringify(a2Row));
  check('d1 行(草稿)存在且 signupCount=1', d1Row.signupCount === 1, JSON.stringify(d1Row));

  // ---- 断言: status=signup_open 过滤 ----
  const ov2 = await api('GET', '/zhao-point/v1/admin/adm/activity-overview?status=signup_open', { token: adminToken });
  const d2 = ov2.json && ov2.json.data;
  const rows2 = d2 ? d2.rows : [];
  check('signup_open: 仅 sf2+a2(2 活动), 无草稿/ended', d2 && d2.summary.activityCount === 2 && rows2.length === 2 && !rows2.some((r) => r.status === 'draft'), `count=${d2 && d2.summary.activityCount} len=${rows2.length}`);
  const srow2 = rows2.find((r) => r.type === 'series');
  check('signup_open: series 行仅聚合 sf2(signup=2 attended=1)', srow2 && srow2.signupCount === 2 && srow2.attendedCount === 1 && srow2.detail.length === 1, JSON.stringify(srow2));
  check('signup_open: summary.signupCount=3', d2 && d2.summary.signupCount === 3, `v=${d2 && d2.summary.signupCount}`);

  // ---- 清理(零残留) ----
  for (const a of createdActs) {
    await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_id = $1`, [a.id]);
    await client.query(`DELETE FROM activity_referral_rewards_activity_lnk WHERE activity_id = $1`, [a.id]);
    const ss = await q(`SELECT activity_signup_id::int AS id FROM activity_signups_activity_lnk WHERE activity_id = $1`, [a.id]);
    for (const s of ss) {
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
  await client.query(`DELETE FROM activity_series WHERE title LIKE '验收-%'`);
  await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_series_id NOT IN (SELECT id FROM activity_series) OR activity_id NOT IN (SELECT id FROM activities)`);
  // 测试用户(含其点记录/渠道)
  const upIds = await q(`SELECT id FROM up_users WHERE username LIKE '${PF}%'`);
  for (const u of upIds) {
    const recIds = await q(`SELECT point_record_id::int AS id FROM zhao_point_records_user_lnk WHERE user_id = $1`, [u.id]);
    for (const r of recIds) {
      await client.query(`DELETE FROM zhao_point_records_user_lnk WHERE point_record_id = $1`, [r.id]);
      await client.query(`DELETE FROM zhao_point_records_user_channel_lnk WHERE point_record_id = $1`, [r.id]);
      await client.query(`DELETE FROM zhao_point_records WHERE id = $1`, [r.id]);
    }
    const members = await q(`SELECT id FROM zhao_channel_members_user_lnk WHERE user_id = $1`, [u.id]);
    const memberIds = members.map((m) => m.id);
    if (memberIds.length) {
      const chIds = await q(`SELECT DISTINCT channel_id AS id FROM zhao_channel_members_channel_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_channel_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_invited_by_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members_user_lnk WHERE channel_member_id = ANY($1)`, [memberIds]);
      await client.query(`DELETE FROM zhao_channel_members WHERE id = ANY($1)`, [memberIds]);
      for (const ch of chIds) await client.query(`DELETE FROM zhao_channels WHERE id = $1 AND (name LIKE '${PF}%的个人渠道')`, [ch.id]);
    }
    await client.query(`DELETE FROM up_users WHERE id = $1`, [u.id]);
  }

  const residue = await q(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE '验收-%') a,
      (SELECT count(*)::int FROM activity_series WHERE title LIKE '验收-%') s,
      (SELECT count(*)::int FROM activity_signups_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) su,
      (SELECT count(*)::int FROM activity_referral_rewards_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) rr,
      (SELECT count(*)::int FROM up_users WHERE username LIKE '${PF}%') u,
      (SELECT count(*)::int FROM zhao_point_records_user_lnk ul JOIN up_users uu ON uu.id = ul.user_id WHERE uu.username LIKE '${PF}%') pl`);
  const res = residue[0];
  check(`清理完成(活动=${res.a} 系列=${res.s} 报名孤儿=${res.su} 奖励孤儿=${res.rr} 测试用户=${res.u} 点记录=${res.pl})`,
    res.a === 0 && res.s === 0 && res.su === 0 && res.rr === 0 && res.u === 0 && res.pl === 0);

  await client.end();
  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
