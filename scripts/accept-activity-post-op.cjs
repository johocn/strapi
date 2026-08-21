/* 活动后运营（三合一闭环）验收
 * 用法: cd e:\code\basic && node scripts/accept-activity-post-op.cjs
 * 覆盖:
 *  a) T3 评价权限: 未报名用户调 review → 403，不落库
 *  b) T3 adminClose: 置 ended；到场用户→act_receipt(立即)+act_repurchase(次日)；未到场→act_revisit(次日)
 *  c) T1 评价落库: 到场用户提交 {rating,nps,review} → activity_signups 三字段+reviewedAt；部分更新(改rating)保留 review
 *  d) T3 看板: GET /adm/activity-reviews → summary(count/avgRating/NPS三档) + rows 用户
 *  e) 清理零残留
 *
 * 运行前置: 本地 Strapi develop 已运行(127.0.0.1:1337)且已重编译插件。
 * 用户: zhao-auth register 生成 up_users；每人桥接 sso_users(username 匹配) 供 resolveSsoUserForUpUser 命中。
 * 消息: 预插 act_receipt/act_repurchase/act_revisit 三个 enabled 模板(name 标识 '验收活动后模板%')供 buildJob 解析。
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
  for (let i = 0; i < 40; i++) {
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
async function register(prefix) {
  const uname = 'accr_po_' + prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
  const res = await api('POST', '/zhao-auth/v1/register', {
    body: { username: uname, email: `${uname}@audit.local`, password: 'a123456', confirmPassword: 'a123456' },
  });
  const j = res.json || {};
  const user = j.user || j.data?.user || j.data || j;
  return { id: user?.id || user?.documentId, token: tokenOf(j), username: uname };
}
// 桥接 sso_users：username 与 up_users 一致，供 resolveSsoUserForUpUser 命中
async function bridgeSso(upUserUsername) {
  const ins = await client.query(
    `INSERT INTO sso_users (document_id, uuid, username, email, password_hash, status, register_channel, login_count, created_at, updated_at)
     VALUES ($1,$2,$3,$4,'$2b$12$acceptpo','active','accept',0,now(),now()) RETURNING id`,
    [crypto.randomUUID(), crypto.randomUUID(), upUserUsername, `${upUserUsername}@audit.local`]);
  return ins.rows[0].id;
}
// 预插模板供 buildJob 解析
async function insertTemplate(code) {
  const ins = await client.query(
    `INSERT INTO sso_msg_templates (document_id, code, name, provider, is_enabled, created_at, updated_at)
     VALUES ($1,$2,$3,'wechat',true,now(),now()) RETURNING id`,
    [crypto.randomUUID(), code, '验收活动后模板:' + code]);
  return ins.rows[0].id;
}
async function insertActivity(title) {
  const docId = crypto.randomUUID();
  const now = Date.now();
  const ins = await client.query(
    `INSERT INTO activities (document_id,title,description,start_time,end_time,venue_name,capacity,used_capacity,signup_start,signup_end,checkin_mode,geo_enforced,status,channel_scope,points_cost,fee_collect_at,pricing_mode,created_at,updated_at)
     VALUES ($1,$2,'验收活动后',$3,$4,'验收场地',50,0,$5,$6,'self',false,'signup_open','all',0,'signup','flat',now(),now()) RETURNING id`,
    [docId, title, new Date(now + 86400e3), new Date(now + 2 * 86400e3),
     new Date(now - 3600e3), new Date(now + 72 * 3600e3)]);
  return { docId, id: ins.rows[0].id };
}
const jobsOf = async (ssoId) => (await client.query(
  `SELECT j.* FROM sso_msg_jobs j JOIN sso_msg_jobs_user_lnk jl ON jl.msg_job_id = j.id WHERE jl.sso_user_id = $1`, [ssoId])).rows;
const jobByScene = (jobs, scene) => jobs.find((j) => j.scene === scene) || null;
// 模板为 manyToOne 关系，经多处 join 表 sso_msg_jobs_template_lnk 关联（sso_msg_jobs 无 template_id 列）
const jobTemplateId = async (jobId) => {
  if (!jobId) return null;
  const r = await client.query(`SELECT msg_template_id::int AS id FROM sso_msg_jobs_template_lnk WHERE msg_job_id = $1`, [jobId]);
  return r.rows[0]?.id ?? null;
};

// ---- 清理 ----
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
        await client.query(`DELETE FROM zhao_channels WHERE id = $1 AND name LIKE 'accr_po_%的个人渠道'`, [ch.id]);
      }
    }
  }
  const ssoIds = (await client.query(`SELECT id FROM sso_users WHERE username LIKE 'accr_po_%'`)).rows.map((r) => r.id);
  if (ssoIds.length) {
    const jobIds = (await client.query(`SELECT DISTINCT msg_job_id AS id FROM sso_msg_jobs_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds])).rows.map((r) => r.id);
    const tokIds = (await client.query(`SELECT DISTINCT sso_token_id AS id FROM sso_tokens_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds])).rows.map((r) => r.id);
    const logIds = (await client.query(`SELECT DISTINCT sso_login_log_id AS id FROM sso_login_logs_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds])).rows.map((r) => r.id);
    await client.query(`DELETE FROM sso_msg_jobs_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds]);
    if (jobIds.length) await client.query(`DELETE FROM sso_msg_jobs WHERE id = ANY($1)`, [jobIds]);
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

  // ---- 开头清场 ----
  await client.query(`DELETE FROM activities WHERE title LIKE '验收-活动后%'`);
  await client.query(`DELETE FROM sso_msg_templates WHERE name LIKE '验收活动后模板%'`);
  const leftUsers = await client.query(`SELECT id FROM up_users WHERE username LIKE 'accr_po_%'`);
  await purgeUsers(leftUsers.rows.map((r) => r.id));

  // ---- admin 登录 ----
  const adminLogin = await waitForServer() || (await login('1117', 'a123456'));
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 80));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  // ---- 预插模板 ----
  const tmplCodes = ['act_receipt', 'act_repurchase', 'act_revisit'];
  for (const c of tmplCodes) { try { await insertTemplate(c); } catch {} }
  check('预插 3 个活动后模板', (await client.query(`SELECT count(*)::int n FROM sso_msg_templates WHERE name LIKE '验收活动后模板%'`)).rows[0].n === 3);

  // ---- 注册用户 ----
  const names = ['A', 'B', 'C'];
  const users = {};
  for (const n of names) {
    users[n] = await register(n);
  }
  check('注册 A/B/C 用户', names.every((n) => users[n] && users[n].id && users[n].token));
  // 桥接 sso（A到场/B未到场需触发 jobs；C用于未报名403）
  const aSso = await bridgeSso(users.A.username);
  const bSso = await bridgeSso(users.B.username);
  check('A/B 桥接 sso_users', !!aSso && !!bSso);

  // ---- 插活动 ----
  const act = await insertActivity('验收-活动后闭环');

  const signup = (u) => api('POST', '/zhao-point/v1/my/activity/signup', { token: u.token, body: { activityId: act.docId } });
  const checkinAct = (u) => api('POST', `/zhao-point/v1/my/activity/${act.docId}/checkin`, { token: u.token, body: { method: 'self' } });
  const review = (u, body) => api('POST', `/zhao-point/v1/activities/${act.docId}/review`, { token: u.token, body });

  try {
    // ===== a) 未报名用户评价 → 403 =====
    let r = await review(users.C, { rating: 5, nps: 10, review: '不应入库' });
    check('a 未报名用户 review 被拒(403)', r.status === 403, `status=${r.status} json=${JSON.stringify(r.json)}`);

    // ===== 报名 + 签到（A到场；B未到场） =====
    r = await signup(users.A);
    check('A 报名 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    r = await signup(users.B);
    check('B 报名 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    r = await checkinAct(users.A);
    check('A 签到(到场) ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));

    // ===== b) adminClose 关闭 + 触发 =====
    const nowTs = Date.now();
    r = await api('POST', `/zhao-point/v1/admin/adm/activities/${act.docId}/close`, { token: adminToken });
    const closeData = r.json?.data || r.json;
    check('b adminClose 关闭成功(ended)', closeData && closeData.ok === true && closeData.closed === true,
      `status=${r.status} json=${JSON.stringify(r.json).slice(0, 200)}`);
    check('b 到场触达计数 review=1 repurchase=1', closeData && closeData.reviewTriggered === 1 && closeData.repurchaseTriggered === 1,
      `review=${closeData?.reviewTriggered} repurchase=${closeData?.repurchaseTriggered}`);
    check('b 未到场触达计数 revisit=1', closeData && closeData.revisitTriggered === 1, `revisit=${closeData?.revisitTriggered}`);
    const endedStatus = (await client.query(`SELECT status FROM activities WHERE id=$1`, [act.id])).rows[0]?.status;
    check('b 活动 status=ended(DB)', endedStatus === 'ended', `status=${endedStatus}`);

    // ---- job 断言 ----
    const aJobs = await jobsOf(aSso);
    const bJobs = await jobsOf(bSso);
    const aReceipt = jobByScene(aJobs, 'activity.receipt');
    const aRepur = jobByScene(aJobs, 'activity.repurchase');
    const bRevisit = jobByScene(bJobs, 'activity.closed');
    const tplMap = (await client.query(`SELECT id, code FROM sso_msg_templates WHERE code = ANY($1)`, [tmplCodes])).rows;
    const tplIdOf = (code) => tplMap.find((t) => t.code === code)?.id;
    const aReceiptTpl = await jobTemplateId(aReceipt?.id);
    const aRepurTpl = await jobTemplateId(aRepur?.id);
    const bRevisitTpl = await jobTemplateId(bRevisit?.id);
    check('b A 有 act_receipt job(status=pending, 立即无 scheduledAt, 指向 act_receipt 模板)',
      aReceipt && aReceipt.status === 'pending' && aReceipt.scheduled_at == null && aReceiptTpl && aReceiptTpl === tplIdOf('act_receipt'),
      JSON.stringify(aReceipt ? { status: aReceipt.status, at: aReceipt.scheduled_at, tpl: aReceiptTpl } : null));
    const aRepurAt = aRepur ? new Date(aRepur.scheduled_at).getTime() : 0;
    check('b A repurchase job scheduledAt≈now+1440min(status=pending, 指向 act_repurchase)',
      aRepur && aRepur.status === 'pending' && aRepurAt >= nowTs + 1439 * 60000 && aRepurAt <= nowTs + 1441 * 60000 && aRepurTpl === tplIdOf('act_repurchase'),
      aRepur ? `at=${new Date(aRepur.scheduled_at).toISOString()} tpl=${aRepurTpl}` : 'no repurchase job');
    const bRevAt = bRevisit ? new Date(bRevisit.scheduled_at).getTime() : 0;
    check('b B revisit job scheduledAt≈now+1440min(status=pending, 指向 act_revisit)',
      bRevisit && bRevisit.status === 'pending' && bRevAt >= nowTs + 1439 * 60000 && bRevAt <= nowTs + 1441 * 60000 && bRevisitTpl === tplIdOf('act_revisit'),
      bRevisit ? `at=${new Date(bRevisit.scheduled_at).toISOString()} tpl=${bRevisitTpl}` : 'no revisit job');

    // ===== c) 评价落库（A 到场，允许评价） =====
    r = await review(users.A, { rating: 5, nps: 10, review: '很棒' });
    check('c 提交评价 ok', r.json?.data?.ok === true, `status=${r.status} ${JSON.stringify(r.json)}`);
    let sa = (await client.query(
      `SELECT s.rating, s.nps, s.review, s.reviewed_at FROM activity_signups s
         JOIN activity_signups_activity_lnk al ON al.activity_signup_id = s.id
         JOIN activity_signups_user_lnk ul ON ul.activity_signup_id = s.id
        WHERE al.activity_id = $1 AND ul.user_id = $2`, [act.id, users.A.id])).rows[0];
    check('c 落库 rating=5 nps=10 review=很棒 reviewedAt 非空',
      sa && sa.rating === 5 && sa.nps === 10 && sa.review === '很棒' && !!sa.reviewed_at, JSON.stringify(sa));
    r = await review(users.A, { rating: 4 });
    sa = (await client.query(
      `SELECT s.rating, s.nps, s.review FROM activity_signups s
         JOIN activity_signups_activity_lnk al ON al.activity_signup_id = s.id
         JOIN activity_signups_user_lnk ul ON ul.activity_signup_id = s.id
        WHERE al.activity_id = $1 AND ul.user_id = $2`, [act.id, users.A.id])).rows[0];
    check('c 部分更新 rating 变4、nps/review 保留', sa && sa.rating === 4 && sa.nps === 10 && sa.review === '很棒', JSON.stringify(sa));

    // ===== d) 看板聚合 =====
    r = await api('GET', `/zhao-point/v1/admin/adm/activity-reviews?activityDId=${act.docId}`, { token: adminToken });
    const resp = r.json;
    check('d 看板返回成功', r.status === 200 && resp && Array.isArray(resp.rows), `status=${r.status} ${JSON.stringify(resp).slice(0, 120)}`);
    check('d summary.count>=1 且 avgRating=4(该活动仅A)', resp && resp.summary.count >= 1 && resp.summary.avgRating === 4,
      JSON.stringify(resp?.summary));
    check('d NPS 三档统计: A是nps10→promoter=1', resp && resp.summary.promoter >= 1 && resp.summary.detractor === 0,
      `prom${resp?.summary?.promoter} det${resp?.summary?.detractor} pas${resp?.summary?.passive}`);
    check('d npsScore=100(全 promoter)', resp && resp.summary.npsScore === 100, `npsScore=${resp?.summary?.npsScore}`);
    check('d rows[0] 含 username/rating/nps/review', resp && (resp.rows[0]?.user?.username || false) && resp.rows[0]?.rating === 4 && resp.rows[0]?.nps === 10 && resp.rows[0]?.review === '很棒',
      JSON.stringify(resp?.rows?.[0]));
  } finally {
    // ===== 清理（零残留） =====
    const attIds = await client.query(
      `SELECT sl.activity_attendance_id::int AS id FROM activity_attendances_signup_lnk sl
         JOIN activity_signups sg ON sg.id = sl.activity_signup_id
         JOIN activity_signups_activity_lnk al ON al.activity_signup_id = sg.id
        WHERE al.activity_id = $1`, [act.id]);
    for (const att of attIds.rows) {
      await client.query(`DELETE FROM activity_attendances_signup_lnk WHERE activity_attendance_id = $1`, [att.id]);
      await client.query(`DELETE FROM activity_attendances WHERE id = $1`, [att.id]);
    }
    const signupIds = await client.query(`SELECT al.activity_signup_id::int AS id FROM activity_signups_activity_lnk al WHERE al.activity_id = $1`, [act.id]);
    for (const s of signupIds.rows) {
      await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id = $1`, [s.id]);
      await client.query(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [s.id]);
      await client.query(`DELETE FROM activity_signups WHERE id = $1`, [s.id]);
    }
    await client.query(`DELETE FROM activities WHERE title LIKE '验收-活动后%'`);
    await client.query(`DELETE FROM sso_msg_templates WHERE name LIKE '验收活动后模板%'`);
    await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)`);
    await purgeUsers(names.map((n) => users[n] && users[n].id));
  }

  // ---- 残留统计 ----
  const residue = await client.query(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE '验收-活动后%') a,
      (SELECT count(*)::int FROM activity_signups_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) su,
      (SELECT count(*)::int FROM up_users WHERE username LIKE 'accr_po_%') u,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE 'accr_po_%') s,
      (SELECT count(*)::int FROM sso_msg_templates WHERE name LIKE '验收活动后模板%') t`);
  const res = residue.rows[0];
  check(`清理完成(活动=${res.a} 报名孤儿=${res.su} 测试用户=${res.u} sso用户=${res.s} 模板=${res.t})`,
    res.a === 0 && res.su === 0 && res.u === 0 && res.s === 0 && res.t === 0);

  await client.end();
  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });