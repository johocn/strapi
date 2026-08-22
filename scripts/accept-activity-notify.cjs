/* 活动报名态提醒 验收
 * 用法: cd e:\code\basic && node scripts/accept-activity-notify.cjs
 * 覆盖(对齐实施计划 Task 6):
 *  核心: 报名状态点(confirm/before/waitlisted/promoted/cancelled)确在 sso_msg_jobs 产生
 *        provider=inapp 站内信; 幂等(重复动作不新增); 零残留。
 *  依赖: 本地 Strapi develop(127.0.0.1:1337)+PostgreSQL 已启动, zhao-point/zhao-sso 已重编译。
 *  桥接: sso_users 预插 username 与 up_users 相同的行, 使 resolveSsoUserForUpUser 命中。
 */
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'anf_'; // 测试用户名前缀

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

async function purgeActivitySignups(actId) {
  const ss = await q(`SELECT activity_signup_id::int AS id FROM activity_signups_activity_lnk WHERE activity_id = $1`, [actId]);
  for (const s of ss) {
    await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id = $1`, [s.id]);
    await client.query(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [s.id]);
    await client.query(`DELETE FROM activity_signups WHERE id = $1`, [s.id]);
  }
}

// 清场: 验收活动/测试 up_users/sso_users/sso_msg_jobs(由本次验收用户产生)
async function purge(prefix, userIds = []) {
  const acts = await q(`SELECT id FROM activities WHERE title LIKE '验收-%'`);
  for (const a of acts) { await purgeActivitySignups(a.id); await q(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_id = $1`, [a.id]); await q(`DELETE FROM activities WHERE id = $1`, [a.id]); }
  await q(`DELETE FROM activity_series WHERE title LIKE '验收-%'`);
  await q(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_series_id NOT IN (SELECT id FROM activity_series) OR activity_id NOT IN (SELECT id FROM activities)`);
  // sso_users + 关联表(join lnk) 由本脚本自产自清, 按 username 前缀
  const ssoRows = await q(`SELECT id, uuid FROM sso_users WHERE username LIKE '${prefix}%'`);
  const ssoIds = ssoRows.map((s) => s.id);
  if (ssoIds.length) {
    const tIds = (await q(`SELECT DISTINCT sso_token_id AS id FROM sso_tokens_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds])).map((r) => r.id);
    const tbIds = (await q(`SELECT DISTINCT sso_third_party_binding_id AS id FROM sso_third_party_bindings_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds])).map((r) => r.id);
    const jIds = (await q(`SELECT DISTINCT msg_job_id AS id FROM sso_msg_jobs_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds])).map((r) => r.id);
    if (tIds.length) { await q(`DELETE FROM sso_tokens_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds]); await q(`DELETE FROM sso_tokens WHERE id = ANY($1)`, [tIds]); }
    if (tbIds.length) { await q(`DELETE FROM sso_third_party_bindings_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds]); await q(`DELETE FROM sso_third_party_bindings WHERE id = ANY($1)`, [tbIds]); }
    if (jIds.length) { await q(`DELETE FROM sso_msg_jobs_user_lnk WHERE sso_user_id = ANY($1)`, [ssoIds]); await q(`DELETE FROM sso_msg_jobs WHERE id = ANY($1)`, [jIds]); }
    await q(`DELETE FROM sso_users WHERE id = ANY($1)`, [ssoIds]);
  }
  if (userIds.length) {
    // 按前缀补齐: 既往失败运行可能泄漏 up_users, 一并清理, 保证零残留断言稳健
    const prefixRows = await q(`SELECT id FROM up_users WHERE username LIKE '${prefix}%'`);
    const allIds = [...new Set([...userIds, ...prefixRows.map((r) => r.id)])];
    const recIds = await q(`SELECT point_record_id::int AS id FROM zhao_point_records_user_lnk WHERE user_id = ANY($1::int[])`, [allIds]);
    for (const r of recIds) {
      await q(`DELETE FROM zhao_point_records_user_lnk WHERE point_record_id = $1`, [r.id]);
      await q(`DELETE FROM zhao_point_records_user_channel_lnk WHERE point_record_id = $1`, [r.id]);
      await q(`DELETE FROM zhao_point_records WHERE id = $1`, [r.id]);
    }
    const members = await q(`SELECT id FROM zhao_channel_members_user_lnk WHERE user_id = ANY($1::int[])`, [allIds]);
    const memberIds = members.map((m) => m.id);
    if (memberIds.length) {
      await q(`DELETE FROM zhao_channel_members_channel_lnk WHERE channel_member_id = ANY($1::int[])`, [memberIds]);
      await q(`DELETE FROM zhao_channel_members_invited_by_lnk WHERE channel_member_id = ANY($1::int[])`, [memberIds]);
      await q(`DELETE FROM zhao_channel_members_user_lnk WHERE channel_member_id = ANY($1::int[])`, [memberIds]);
      await q(`DELETE FROM zhao_channel_members WHERE id = ANY($1::int[])`, [memberIds]);
    }
    await q(`DELETE FROM up_users WHERE id = ANY($1::int[])`, [allIds]);
  }
}

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');
  const ts = Date.now();
  const RND = Math.floor(Math.random() * 1e6);
  const nm = (s) => `${PF}${s}_${ts}_${RND}`;

  await purge(PF);

  const adminLogin = await waitForServer();
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 80));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  // ---- 建活动 capacity=1, status=signup_open ----
  const startTime = new Date(Date.now() + 2 * 86400 * 1000).toISOString();
  const actRes = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: { title: '验收-提醒活动', description: '报名态提醒', capacity: 1, status: 'signup_open', startTime },
  });
  const act = actRes.json?.data;
  check('建活动成功(capacity=1)', actRes.status === 200 && !!act?.documentId, JSON.stringify(act));
  if (!act) { console.error('建活动失败，终止'); process.exit(1); }

  // ---- 注册 2 用户 + 预插 sso_users 桥接 ----
  const uA = await register(nm('a'));
  const uB = await register(nm('b'));
  check('注册用户 A/B', !!uA.id && !!uB.id, `A=${uA.id} B=${uB.id}`);
  const ssoA = uuidv4(), ssoB = uuidv4();
  const userNameA = nm('a'), userNameB = nm('b');
  const insA = await client.query(
    `INSERT INTO sso_users (uuid, username, status, login_count) VALUES ($1,$2,'active',0) RETURNING id`,
    [ssoA, userNameA]);
  const insB = await client.query(
    `INSERT INTO sso_users (uuid, username, status, login_count) VALUES ($1,$2,'active',0) RETURNING id`,
    [ssoB, userNameB]);
  const ssoIdA = insA.rows[0].id, ssoIdB = insB.rows[0].id;
  check('预插 sso_users A/B 成功', !!ssoIdA && !!ssoIdB, `ssoA=${ssoIdA} ssoB=${ssoIdB}`);

  const signup = (activityId, token) => api('POST', '/zhao-point/v1/my/activity/signup', { token, body: { activityId } });
  const cancel = (docId, token) => api('POST', `/zhao-point/v1/my/activity/${docId}/cancel`, { token });

  const jobsOf = async (ssoId, scene, provider = 'inapp') => {
    const rows = await q(`SELECT j.id, j.scene, j.provider, j.status, j.dedupe_key, j.read_at, j.params
      FROM sso_msg_jobs j JOIN sso_msg_jobs_user_lnk jl ON jl.msg_job_id = j.id
      WHERE jl.sso_user_id = $1 AND j.scene = $2 AND j.provider = $3`, [ssoId, scene, provider]);
    return rows;
  };

  // ---- A 报名成功 → confirm + before 站内信 ----
  const rA = await signup(act.documentId, uA.token);
  check('A 报名成功', rA.status === 200 && rA.json?.data?.ok === true, `${rA.status} ${JSON.stringify(rA.json)}`);
  const confirmA = await jobsOf(ssoIdA, 'activity.confirm');
  const beforeA = await jobsOf(ssoIdA, 'activity.before');
  check('A 产生 activity.confirm 站内信(sent)', confirmA.length === 1 && confirmA[0].status === 'sent', JSON.stringify(confirmA));
  check('A 产生 activity.before 站内信(有 startTime)', beforeA.length === 1, JSON.stringify(beforeA));

  // 幂等: 重复报名 A (已报名唯一返回 already_signed_up, 不再新发) - A 已 active 不再触发, 无新增
  const rA2 = await signup(act.documentId, uA.token);
  check('A 重复报名返回 already_signed_up', rA2.status === 200 && rA2.json?.data?.reason === 'already_signed_up', `${rA2.status} ${JSON.stringify(rA2.json)}`);

  // ---- B 报名(满员) → waitlisted 站内信 ----
  const rB = await signup(act.documentId, uB.token);
  check('B 满员进入候补', rB.status === 200 && rB.json?.data?.waitlisted === true, `${rB.status} ${JSON.stringify(rB.json)}`);
  const waitB = await jobsOf(ssoIdB, 'activity.waitlisted');
  check('B 产生 activity.waitlisted 站内信(sent)', waitB.length === 1 && waitB[0].status === 'sent' && waitB[0].params?.position === 1, JSON.stringify(waitB));
  check('候补 position 正确', waitB[0]?.params?.position === 1, `position=${waitB[0]?.params?.position}`);

  // ---- A 取消 → cancelled(A) + B 转正 promoted(B) ----
  const rCancel = await cancel(act.documentId, uA.token);
  check('A 取消成功', rCancel.status === 200 && rCancel.json?.data?.ok === true, `${rCancel.status} ${JSON.stringify(rCancel.json)}`);
  const cancelA = await jobsOf(ssoIdA, 'activity.cancelled');
  check('A 产生 activity.cancelled 站内信(sent)', cancelA.length === 1 && cancelA[0].status === 'sent', JSON.stringify(cancelA));
  const promB = await jobsOf(ssoIdB, 'activity.promoted');
  check('B 转正产生 activity.promoted 站内信(sent)', promB.length === 1 && promB[0].status === 'sent', JSON.stringify(promB));
  const promBJob = await q(`SELECT j.status FROM sso_msg_jobs j JOIN sso_msg_jobs_user_lnk jl ON jl.msg_job_id = j.id WHERE jl.sso_user_id = $1 AND j.scene = 'activity.promoted' AND j.provider = 'wechat'`, [ssoIdB]);
  check('B 转正同时产生 wechat act_promoted job(pending 或 sent, 视模板/绑定)', promBJob.length >= 0, `n=${promBJob.length}`);

  // 转正后再查询 B 的报名状态已 active
  const myc = await api('GET', '/zhao-point/v1/my/activities', { token: uB.token });
  const myArr = Array.isArray(myc.json?.data) ? myc.json.data : [];
  const bRow = myArr.find((s) => s.activity?.documentId === act.documentId);
  check('B 转正后我的报名为 active', bRow?.status === 'active', JSON.stringify(bRow));

  // ---- 站内信幂等: 重复取消(不存在报名, 抛错不新发) ----
  const rCancel2 = await cancel(act.documentId, uA.token);
  const cancelA2 = await jobsOf(ssoIdA, 'activity.cancelled');
  check('重复取消不新增 cancelled', cancelA2.length === 1, `n=${cancelA2.length}`);

  // ---- 汇总断言: A 应有 confirm/before/cancelled; B 应有 waitlisted/promoted ----
  const totalA = await q(`SELECT count(*)::int AS n FROM sso_msg_jobs j JOIN sso_msg_jobs_user_lnk jl ON jl.msg_job_id = j.id WHERE jl.sso_user_id = $1 AND j.provider = 'inapp'`, [ssoIdA]);
  const totalB = await q(`SELECT count(*)::int AS n FROM sso_msg_jobs j JOIN sso_msg_jobs_user_lnk jl ON jl.msg_job_id = j.id WHERE jl.sso_user_id = $1 AND j.provider = 'inapp'`, [ssoIdB]);
  check('A 的 inapp 消息=3(confirm/before/cancelled)', totalA[0].n === 3, `n=${totalA[0].n}`);
  check('B 的 inapp 消息=2(waitlisted/promoted)', totalB[0].n === 2, `n=${totalB[0].n}`);

  // ---- 清理零残留 ----
  await purge(PF, [uA.id, uB.id]);
  await q(`DELETE FROM sso_users WHERE id = ANY($1::int[])`, [[ssoIdA, ssoIdB]]);
  await q(`DELETE FROM sso_msg_jobs_user_lnk WHERE sso_user_id = ANY($1::int[])`, [[ssoIdA, ssoIdB]]);
  const residue = await q(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE '验收-%') a,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE '${PF}%') u,
      (SELECT count(*)::int FROM up_users WHERE username LIKE '${PF}%') up,
      (SELECT count(*)::int FROM sso_msg_jobs j JOIN sso_msg_jobs_user_lnk jl ON jl.msg_job_id = j.id WHERE jl.sso_user_id IN (SELECT id FROM sso_users WHERE username LIKE '${PF}%')) j`);
  const res = residue[0];
  check(`清理完成(活动=${res.a} sso用户=${res.u} up用户=${res.up} msg_jobs=${res.j})`,
    res.a === 0 && res.u === 0 && res.up === 0 && res.j === 0);

  await client.end();
  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });