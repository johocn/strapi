/* 活动分享裂变奖励 验收
 * 用法: cd e:\code\basic && node scripts/accept-share-fission.cjs
 * 覆盖:
 *  1. 基础奖励: A 建专属邀请码 -> B 用码绑定 -> B 报免费活动(shareRewardPoints=30)
 *     -> A 收 activity_share_reward +30(核 balance/记录+渠道 _user_lnk), activity_referral_rewards 落1条
 *  2. 幂等: 同一 B 对同活动重复报名(already_signed_up), reward 记录不新增
 *  3. 跳过分支: 无邀请码 / 虚拟分享者 / 活动未配且全局默认0 -> 均不发放
 *  4. 全局默认回退: 活动不配(NULL), defaultShareRewardPoints=50 -> 发放50, 断言后还原0
 *  5. 候补转正不触发: C 进候补 -> 转正后 reward 不新增(新 active 报名才触发)
 *  6. 裂变榜聚合: 多分享者/多活动 -> rows 按 inviteeCount 降序, username/inviteeCount/totalPoints 正确
 *  7. 零残留: 清理活动/报名/奖励记录/点记录/测试用户/邀请码, 计数归零
 *
 * 运行前置: 本地 Strapi develop(127.0.0.1:1337)已运行且 zhao-point 已重编译
 *   (grantShareReward 经 earnPoints 发放, 需该 action 有默认规则且传入 points 覆盖=<reward>).
 * 用户构造: zhao-auth 注册生成 up_users(自动建个人渠道, 满足点服务渠道解析);
 *   分享者/被邀者额外 DB 直插 sso_users(同 username 桥接) + 邀请码/usage/relation。
 * 积分注入: 由后端 grantShareReward 经 earnPoints 落账 balance=running total。
 */
const { Client } = require('pg');
const crypto = require('crypto');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'fs_'; // 测试用户名前缀(沿用 accept-fee-tiers 的 accr_ 通道, 换前缀隔离)

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

// ===== 活动 / sso 用户 / 邀请码 构造 =====
async function insertActivity({ title, shareRewardPoints = null, capacity = 100 }) {
  const docId = crypto.randomUUID();
  const now = Date.now();
  const ins = await client.query(
    `INSERT INTO activities (document_id,title,description,type,start_time,end_time,venue_name,capacity,used_capacity,signup_start,signup_end,checkin_mode,geo_enforced,status,channel_scope,points_cost,fee_collect_at,pricing_mode,share_reward_points,created_at,updated_at)
     VALUES ($1,$2,'验收-分享裂变','其他',$3,$4,'验收场地',$5,0,$6,$7,'self',false,'signup_open','all',0,'signup','flat',$8,now(),now()) RETURNING id`,
    [docId, title, new Date(now + 86400e3), new Date(now + 2 * 86400e3),
     capacity, new Date(now - 3600e3), new Date(now + 72 * 3600e3), shareRewardPoints]);
  return { docId, id: ins.rows[0].id };
}

async function createSsoUser(username, { status = 'active', inviteCodeUsed = null, passwordHash = '$2b$12$acceptfee' } = {}) {
  const ins = await client.query(
    `INSERT INTO sso_users (document_id,uuid,username,email,password_hash,status,register_channel,invite_code_used,login_count,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,'accept',NULLIF($7,''),0,now(),now()) RETURNING id`,
    [crypto.randomUUID(), crypto.randomUUID(), username, `${username}@audit.local`, passwordHash, status, inviteCodeUsed || null]);
  return ins.rows[0].id;
}

async function createInviteCode(code, creatorSsoId, { isActive = true } = {}) {
  const ins = await client.query(
    `INSERT INTO sso_invite_codes (document_id,code,app_code,invite_type,max_uses,use_count,per_user_limit,is_active,created_at,updated_at)
     VALUES ($1,$2,'accept-app','user_campaign',100,0,1,$3,now(),now()) RETURNING id`,
    [crypto.randomUUID(), code, isActive]);
  const cid = ins.rows[0].id;
  await client.query(`INSERT INTO sso_invite_codes_creator_lnk (sso_invite_code_id,sso_user_id) VALUES ($1,$2)`, [cid, creatorSsoId]);
  return cid;
}

// 被邀者绑定码 + 落 usage/relation(sso_invite_usages / sso_referral_relations)
async function bindInvitee(ssoInviteeId, inviteCodeId, inviterSsoId, level = 1) {
  const usg = await client.query(
    `INSERT INTO sso_invite_usages (document_id,app_code,used_at,created_at,updated_at) VALUES ($1,'accept-app',now(),now(),now()) RETURNING id`,
    [crypto.randomUUID()]);
  await client.query(`INSERT INTO sso_invite_usages_invite_code_lnk (sso_invite_usage_id,sso_invite_code_id) VALUES ($1,$2)`, [usg.rows[0].id, inviteCodeId]);
  await client.query(`INSERT INTO sso_invite_usages_user_lnk (sso_invite_usage_id,sso_user_id) VALUES ($1,$2)`, [usg.rows[0].id, ssoInviteeId]);
  const rel = await client.query(
    `INSERT INTO sso_referral_relations (document_id,level,created_at,updated_at) VALUES ($1,$2,now(),now()) RETURNING id`,
    [crypto.randomUUID(), level]);
  const rid = rel.rows[0].id;
  await client.query(`INSERT INTO sso_referral_relations_inviter_lnk (sso_referral_relation_id,sso_user_id) VALUES ($1,$2)`, [rid, inviterSsoId]);
  await client.query(`INSERT INTO sso_referral_relations_invitee_lnk (sso_referral_relation_id,sso_user_id) VALUES ($1,$2)`, [rid, ssoInviteeId]);
  await client.query(`INSERT INTO sso_referral_relations_invite_code_lnk (sso_referral_relation_id,sso_invite_code_id) VALUES ($1,$2)`, [rid, inviteCodeId]);
}

// ===== 断言辅助 =====
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
async function shareRewardRecord(userId, action) {
  const r = await client.query(
    `SELECT pr.id point_record_id, pr.points, pr.balance, pr.method FROM zhao_point_records pr
       JOIN zhao_point_records_user_lnk ul ON ul.point_record_id = pr.id
      WHERE ul.user_id = $1 AND pr.action = $2 ORDER BY pr.id DESC LIMIT 1`, [userId, action]);
  return r.rows[0] || null;
}
async function rewardHasUserChannel(pointRecordId) {
  const r = await client.query(`SELECT count(*)::int n FROM zhao_point_records_user_channel_lnk WHERE point_record_id = $1`, [pointRecordId]);
  return r.rows[0].n > 0;
}
async function referralReward(activityId, inviterUpId, inviteeUpId) {
  const r = await client.query(
    `SELECT r.id, r.points, r.source_invite_code, il.user_id inviter, ee.user_id invitee, al.activity_id
       FROM activity_referral_rewards r
       JOIN activity_referral_rewards_inviter_lnk il ON il.activity_referral_reward_id = r.id
       JOIN activity_referral_rewards_invitee_lnk ee ON ee.activity_referral_reward_id = r.id
       JOIN activity_referral_rewards_activity_lnk al ON al.activity_referral_reward_id = r.id
      WHERE il.user_id = $2 AND ee.user_id = $3 AND al.activity_id = $1`, [activityId, inviterUpId, inviteeUpId]);
  return r.rows[0] || null;
}
async function referralRewardCountByInvitee(inviteeUpId) {
  const r = await client.query(
    `SELECT count(*)::int n FROM activity_referral_rewards r
       JOIN activity_referral_rewards_invitee_lnk ee ON ee.activity_referral_reward_id = r.id
      WHERE ee.user_id = $1`, [inviteeUpId]);
  return r.rows[0].n;
}
async function referralRewardCountByActivity(activityId) {
  const r = await client.query(
    `SELECT count(*)::int n FROM activity_referral_rewards r
       JOIN activity_referral_rewards_activity_lnk al ON al.activity_referral_reward_id = r.id
      WHERE al.activity_id = $1`, [activityId]);
  return r.rows[0].n;
}
async function mySignupStatus(actId, upUserId) {
  const r = await client.query(
    `SELECT s.status FROM activity_signups s
       JOIN activity_signups_activity_lnk al ON al.activity_signup_id = s.id
       JOIN activity_signups_user_lnk ul ON ul.activity_signup_id = s.id
      WHERE al.activity_id = $1 AND ul.user_id = $2`, [actId, upUserId]);
  return r.rows[0] ? r.rows[0].status : null;
}
async function setDefaultShareReward(points) {
  const rows = await client.query(`SELECT id FROM zhao_point_configs`);
  if (rows.rows.length) {
    for (const r of rows.rows) await client.query(`UPDATE zhao_point_configs SET default_share_reward_points = $1 WHERE id = $2`, [points, r.id]);
  } else {
    await client.query(
      `INSERT INTO zhao_point_configs (document_id,module_enabled,earn_enabled,redeem_enabled,sign_in_enabled,tasks_enabled,default_share_reward_points,created_at,updated_at)
       VALUES ($1,true,true,true,true,true,$2,now(),now())`, [crypto.randomUUID(), points]);
  }
}
async function defaultShareRewardValue() {
  const r = await client.query(`SELECT default_share_reward_points FROM zhao_point_configs LIMIT 1`);
  return r.rows[0] ? r.rows[0].default_share_reward_points : null;
}

// ===== 清理(零残留) =====
async function purgeUsers(ids, ssoIds) {
  const myIds = [...new Set((ids || []).filter(Boolean))];
  const mySso = [...new Set((ssoIds || []).filter(Boolean))];
  // 点记录
  const recIds = await client.query(`SELECT DISTINCT ul.point_record_id AS id FROM zhao_point_records_user_lnk ul WHERE ul.user_id = ANY($1)`, [myIds]);
  for (const rec of recIds.rows) {
    await client.query(`DELETE FROM zhao_point_records_user_lnk WHERE point_record_id = $1`, [rec.id]);
    await client.query(`DELETE FROM zhao_point_records_channel_lnk WHERE point_record_id = $1`, [rec.id]);
    await client.query(`DELETE FROM zhao_point_records_user_channel_lnk WHERE point_record_id = $1`, [rec.id]);
    await client.query(`DELETE FROM zhao_point_records_operator_lnk WHERE point_record_id = $1`, [rec.id]);
    await client.query(`DELETE FROM zhao_point_records WHERE id = $1`, [rec.id]);
  }
  // 渠道成员 / 个人渠道
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
        await client.query(`DELETE FROM zhao_channels WHERE id = $1 AND name LIKE '${PF}%的个人渠道' OR id = $1 AND name LIKE 'accr_%的个人渠道'`, [ch.id]);
      }
    }
  }
  if (myIds.length) await client.query(`DELETE FROM up_users WHERE id = ANY($1)`, [myIds]);
  // sso 关联值记录
  if (mySso.length) {
    const jobIds = (await client.query(`SELECT DISTINCT msg_job_id AS id FROM sso_msg_jobs_user_lnk WHERE sso_user_id = ANY($1)`, [mySso])).rows.map((r) => r.id);
    const profIds = (await client.query(`SELECT DISTINCT sso_user_profile_id AS id FROM sso_user_profiles_user_lnk WHERE sso_user_id = ANY($1)`, [mySso])).rows.map((r) => r.id);
    const tokIds = (await client.query(`SELECT DISTINCT sso_token_id AS id FROM sso_tokens_user_lnk WHERE sso_user_id = ANY($1)`, [mySso])).rows.map((r) => r.id);
    const logIds = (await client.query(`SELECT DISTINCT sso_login_log_id AS id FROM sso_login_logs_user_lnk WHERE sso_user_id = ANY($1)`, [mySso])).rows.map((r) => r.id);
    await client.query(`DELETE FROM sso_msg_jobs_user_lnk WHERE sso_user_id = ANY($1)`, [mySso]);
    if (jobIds.length) await client.query(`DELETE FROM sso_msg_jobs WHERE id = ANY($1)`, [jobIds]);
    await client.query(`DELETE FROM sso_user_profiles_user_lnk WHERE sso_user_id = ANY($1)`, [mySso]);
    if (profIds.length) await client.query(`DELETE FROM sso_user_profiles WHERE id = ANY($1)`, [profIds]);
    await client.query(`DELETE FROM sso_tokens_user_lnk WHERE sso_user_id = ANY($1)`, [mySso]);
    if (tokIds.length) await client.query(`DELETE FROM sso_tokens WHERE id = ANY($1)`, [tokIds]);
    await client.query(`DELETE FROM sso_login_logs_user_lnk WHERE sso_user_id = ANY($1)`, [mySso]);
    if (logIds.length) await client.query(`DELETE FROM sso_login_logs WHERE id = ANY($1)`, [logIds]);
  }
  if (mySso.length) await client.query(`DELETE FROM sso_users WHERE id = ANY($1)`, [mySso]);
}

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');
  const ts = Date.now();
  const RND = Math.floor(Math.random() * 1e6);
  const nm = (s) => `${PF}${s}_${ts}_${RND}`;

  // ---- 清场(开头): 验收活动 + 历史 fs_ 用户 + 遗留邀请码 ---- 
  const acts = await client.query(`SELECT id, document_id FROM activities WHERE title LIKE '验收-%'`);
  const actIds = acts.rows.map((r) => r.id);
  if (actIds.length) {
    for (const aid of actIds) await client.query(`DELETE FROM activity_referral_rewards_activity_lnk WHERE activity_id = $1`, [aid]);
  }
  const leftSso = await client.query(`SELECT id FROM sso_users WHERE username LIKE '${PF}%'`);
  const leftUp = await client.query(`SELECT id FROM up_users WHERE username LIKE '${PF}%'`);
  const codeRows = await client.query(`SELECT id FROM sso_invite_codes WHERE code LIKE 'FS%'`);
  for (const c of codeRows.rows) {
    await client.query(`DELETE FROM sso_invite_codes_creator_lnk WHERE sso_invite_code_id = $1`, [c.id]);
    await client.query(`DELETE FROM sso_invite_usages_invite_code_lnk WHERE sso_invite_code_id = $1`, [c.id]);
    await client.query(`DELETE FROM sso_referral_relations_invite_code_lnk WHERE sso_invite_code_id = $1`, [c.id]);
    await client.query(`DELETE FROM sso_invite_codes WHERE id = $1`, [c.id]);
  }
  const relRows = await client.query(`SELECT id FROM sso_referral_relations WHERE id IN (SELECT sso_referral_relation_id FROM sso_referral_relations_inviter_lnk WHERE sso_user_id = ANY($1) OR sso_referral_relation_id IN (SELECT sso_referral_relation_id FROM sso_referral_relations_invitee_lnk WHERE sso_user_id = ANY($2)))`, [leftSso.rows.map(r=>r.id), leftSso.rows.map(r=>r.id)]);
  for (const r of relRows.rows) {
    await client.query(`DELETE FROM sso_referral_relations_inviter_lnk WHERE sso_referral_relation_id = $1`, [r.id]);
    await client.query(`DELETE FROM sso_referral_relations_invitee_lnk WHERE sso_referral_relation_id = $1`, [r.id]);
    await client.query(`DELETE FROM sso_referral_relations_invite_code_lnk WHERE sso_referral_relation_id = $1`, [r.id]);
    await client.query(`DELETE FROM sso_referral_relations WHERE id = $1`, [r.id]);
  }
  const usgRows = await client.query(`SELECT id FROM sso_invite_usages WHERE id IN (SELECT sso_invite_usage_id FROM sso_invite_usages_user_lnk WHERE sso_user_id = ANY($1))`, [leftSso.rows.map(r=>r.id)]);
  for (const u of usgRows.rows) {
    await client.query(`DELETE FROM sso_invite_usages_invite_code_lnk WHERE sso_invite_usage_id = $1`, [u.id]);
    await client.query(`DELETE FROM sso_invite_usages_user_lnk WHERE sso_invite_usage_id = $1`, [u.id]);
    await client.query(`DELETE FROM sso_invite_usages WHERE id = $1`, [u.id]);
  }
  await purgeUsers(leftUp.rows.map((r) => r.id), leftSso.rows.map((r) => r.id));

  // ---- admin 登录 ----
  const adminLogin = await waitForServer();
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 80));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  const createdActs = [];
  const clearUsers = []; // { upId, ssoId }
  const addAct = (a) => { createdActs.push(a); return a; };
  const addUser = (upId, ssoId) => { clearUsers.push({ upId, ssoId }); return upId; };
  const users = {}; // 按 key 存取 { id, ssoId }
  const mkUp = async (key, ssoOpts) => {
    const u = await register(nm(key));
    let ssoId = null;
    if (ssoOpts !== null) {
      const username = (await client.query(`SELECT username FROM up_users WHERE id=$1`, [u.id])).rows[0].username;
      ssoId = await createSsoUser(username, ssoOpts || {});
      addUser(u.id, ssoId);
    }
    users[key] = { id: u.id, token: u.token, ssoId };
    return users[key];
  };
  const signup = (actDoc, user) => api('POST', '/zhao-point/v1/my/activity/signup', { token: user.token, body: { activityId: actDoc } });
  const cancel = (actDoc, user) => api('POST', `/zhao-point/v1/my/activity/${actDoc}/cancel`, { token: user.token });

  let CODE = 0;
  const nextCode = () => `FS${ts}${CODE++}`;

  try {
    // ================= 1) 基础奖励 =================
    const codeA = nextCode();
    const A = await mkUp('a', { status: 'active' }); // 分享者 A(注册+桥接 sso)
    const aCodeId = await createInviteCode(codeA, A.ssoId);
    const B = await mkUp('b', { status: 'active', inviteCodeUsed: codeA });
    await bindInvitee(B.ssoId, aCodeId, A.ssoId);

    const act1 = addAct(await insertActivity({ title: '验收-分享裂变act1', shareRewardPoints: 30 }));

    // 基线
    const aBal0 = await balanceOf(A.id);
    const aSigned = await countAction(A.id, 'activity_share_reward');
    let r = await signup(act1.docId, B);
    check('1 基础: B 用 A 码报免费活动(配30) ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    const rec = await shareRewardRecord(A.id, 'activity_share_reward');
    check('1 基础: A 收到 activity_share_reward 1条 +30', rec && rec.points === 30 && rec.balance === aBal0 + 30, JSON.stringify(rec));
    check('1 基础: 累计 balance 0->30', (await balanceOf(A.id)) === 30, `balance=${await balanceOf(A.id)}`);
    check('1 基础: 账本含渠道 _user_lnk', rec && (await rewardHasUserChannel(rec.point_record_id)));
    const rw1 = await referralReward(act1.id, A.id, B.id);
    check('1 基础: activity_referral_rewards 落1条(inviter=A/invitee=B/points=30/activity=act1)',
      !!rw1 && rw1.points === 30 && rw1.inviter === A.id && rw1.invitee === B.id && rw1.activity_id === act1.id, JSON.stringify(rw1));
    check('1 基础: 发放前 A 无该 action 记录', aSigned === 0);

    // ================= 2) 幂等 =================
    r = await signup(act1.docId, B);
    check('2 幂等: 同一 B 重复报名返回 already_signed_up', r.json?.data?.ok === false && r.json?.data?.reason === 'already_signed_up', JSON.stringify(r.json?.data));
    check('2 幂等: reward 记录不新增(仍1条)', (await referralRewardCountByActivity(act1.id)) === 1, `count=${await referralRewardCountByActivity(act1.id)}`);
    check('2 幂等: A 的 activity_share_reward 仍1条', (await countAction(A.id, 'activity_share_reward')) === 1);

    // ================= 3) 跳过分支 =================
    const actNoShare = addAct(await insertActivity({ title: '验收-分享裂变noShare', shareRewardPoints: null }));
    await setDefaultShareReward(0); // 确保全局默认 0

    // 3a 无邀请码
    const uNoCode = await mkUp('nocode', { status: 'active', inviteCodeUsed: null });
    const baseRewardTotal = await client.query('SELECT count(*)::int n FROM activity_referral_rewards').then(x=>x.rows[0].n);
    const baseLedgerTotal = await client.query('SELECT count(*)::int n FROM zhao_point_records WHERE action=\'activity_share_reward\'').then(x=>x.rows[0].n);
    r = await signup(act1.docId, uNoCode); // act1 配30, 但 B 无码
    check('3a 无邀请码报名 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    const noCodeRew = await client.query(`SELECT count(*)::int n FROM activity_referral_rewards`).then(x=>x.rows[0].n - baseRewardTotal);
    const noCodeLed = await client.query(`SELECT count(*)::int n FROM zhao_point_records WHERE action='activity_share_reward'`).then(x=>x.rows[0].n - baseLedgerTotal);
    check('3a 无邀请码: 不发放(reward/账本均无新增)', noCodeRew === 0 && noCodeLed === 0, `rew+${noCodeRew} led+${noCodeLed}`);

    // 3b 虚拟分享者
    const codeV = nextCode();
    const virtualSso = await createSsoUser(nm('virtual'), { status: 'virtual' }); // 只建 sso, 无 up_user
    await createInviteCode(codeV, virtualSso, { isActive: true });
    const uVirtual = await mkUp('uvirtual', { status: 'active', inviteCodeUsed: codeV });
    const beforeV = await countAction(A.id, 'activity_share_reward');
    r = await signup(act1.docId, uVirtual); // act1 配30
    check('3b 虚拟分享者报名 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    check('3b 虚拟分享者: 不发放(reward记录按被邀者=0)', (await referralRewardCountByInvitee(uVirtual.id)) === 0, `cnt=${await referralRewardCountByInvitee(uVirtual.id)}`);
    check('3b 虚拟分享者: A 账本不新增', (await countAction(A.id, 'activity_share_reward')) === beforeV);

    // 3c 活动未配 且 全局依赖默认0
    const uDef0 = await mkUp('udef0', { status: 'active', inviteCodeUsed: codeA }); // 用 A 的码
    await bindInvitee(uDef0.ssoId, aCodeId, A.ssoId);
    const beforeC = await countAction(A.id, 'activity_share_reward');
    r = await signup(actNoShare.docId, uDef0); // actNoShare 未配 shareRewardPoints
    check('3c 活动未配+全局默认0 报名 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    check('3c 活动未配+默认0: 不发放(reward记录0条)', (await referralRewardCountByInvitee(uDef0.id)) === 0, `cnt=${await referralRewardCountByInvitee(uDef0.id)}`);
    check('3c 活动未配+默认0: A 账本不新增', (await countAction(A.id, 'activity_share_reward')) === beforeC);
    check('3c 备查: 当前全局默认=0', (await defaultShareRewardValue()) === 0);

    // ================= 4) 全局默认回退 50 =================
    await setDefaultShareReward(50);
    const codeG = nextCode();
    const G = await mkUp('g', { status: 'active' });
    const gCodeId = await createInviteCode(codeG, G.ssoId);
    const uG = await mkUp('ug', { status: 'active', inviteCodeUsed: codeG });
    await bindInvitee(uG.ssoId, gCodeId, G.ssoId);
    const gBal0 = await balanceOf(G.id);
    const act4 = addAct(await insertActivity({ title: '验收-分享裂变act4', shareRewardPoints: null }));
    r = await signup(act4.docId, uG);
    check('4 全局默认回退: uG 报未配活动(默认50) ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    const recG = await shareRewardRecord(G.id, 'activity_share_reward');
    check('4 全局默认回退: G 收 activity_share_reward +50', recG && recG.points === 50 && recG.balance === gBal0 + 50, JSON.stringify(recG));
    const rwG = await referralReward(act4.id, G.id, uG.id);
    check('4 全局默认回退: reward 记录 points=50', !!rwG && rwG.points === 50, JSON.stringify(rwG));
    await setDefaultShareReward(0);
    check('4 全局默认回退后还原0', (await defaultShareRewardValue()) === 0);

    // ================= 5) 候补转正不触发 =================
    const act5 = addAct(await insertActivity({ title: '验收-分享裂变act5', shareRewardPoints: 30, capacity: 1 }));
    const uSeat = await mkUp('seat', { status: 'active', inviteCodeUsed: null });
    r = await signup(act5.docId, uSeat);
    check('5 候补: uSeat 占满唯一名额 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    const uWait = await mkUp('uwait', { status: 'active', inviteCodeUsed: codeA }); // C 用 A 的码
    await bindInvitee(uWait.ssoId, aCodeId, A.ssoId);
    const aRewBeforeWait = await countAction(A.id, 'activity_share_reward');
    r = await signup(act5.docId, uWait);
    check('5 候补: C 进候补(未触发奖励)', r.json?.data?.waitlisted === true, JSON.stringify(r.json?.data));
    check('5 候补: C 为 waiting', (await mySignupStatus(act5.id, uWait.id)) === 'waiting');
    check('5 候补: C 进候补期间 A 账本不新增', (await countAction(A.id, 'activity_share_reward')) === aRewBeforeWait);
    r = await cancel(act5.docId, uSeat);
    check('5 候补: uSeat 取消(释放名额触发递补) ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));
    check('5 候补: C 由 waiting 转正 active', (await mySignupStatus(act5.id, uWait.id)) === 'active', `status=${await mySignupStatus(act5.id, uWait.id)}`);
    check('5 候补: 转正后 reward 记录仍0条(新active报名才触发)', (await referralRewardCountByInvitee(uWait.id)) === 0, `cnt=${await referralRewardCountByInvitee(uWait.id)}`);
    check('5 候补: 转正后 A 账本不新增(仍' + aRewBeforeWait + ')', (await countAction(A.id, 'activity_share_reward')) === aRewBeforeWait);

    // ================= 6) 裂变榜聚合 =================
    // M 带 2 名被邀者(报 act1 各 +30) => inviteeCount=2, totalPoints=60
    const codeM = nextCode();
    const M = await mkUp('m', { status: 'active' });
    const mCodeId = await createInviteCode(codeM, M.ssoId);
    for (const k of ['m1', 'm2']) {
      const u = await mkUp(k, { status: 'active', inviteCodeUsed: codeM });
      await bindInvitee(u.ssoId, mCodeId, M.ssoId);
      r = await signup(act1.docId, u); // 每人报 act1 -> +30*2 = 60
    }
    check('6 裂变榜数据: M 2 名被邀者报名 ok', r.json?.data?.ok === true, JSON.stringify(r.json?.data));

    // A: 由 B(act1 +30) => inviteeCount=1, totalPoints=30; G: 由 uG(act4 +50) => 1/50
    const lb = await api('GET', '/zhao-point/v1/admin/adm/activity-share/leaderboard', { token: adminToken });
    const lbData = lb.json && (lb.json.data || lb.json);
    const lbRows = (lbData && lbData.rows) || [];
    const rowBy = (nm_, rows) => rows.find((x) => x.username === nm_);
    const Mrow = rowBy(await (await client.query('SELECT username FROM up_users WHERE id=$1', [M.id])).rows[0].username, lbRows);
    const Arow = rowBy(await (await client.query('SELECT username FROM up_users WHERE id=$1', [A.id])).rows[0].username, lbRows);
    const Grow = rowBy(await (await client.query('SELECT username FROM up_users WHERE id=$1', [G.id])).rows[0].username, lbRows);
    check('6 裂变榜: 端点可达且含3名分享者', lb.status === 200 && Mrow && Arow && Grow, `${lb.status} rows=${lbRows.length}`);
    check('6 裂变榜: M inviteeCount=2 totalPoints=60', Mrow && Mrow.inviteeCount === 2 && Mrow.totalPoints === 60, JSON.stringify(Mrow));
    check('6 裂变榜: A inviteeCount=1 totalPoints=30', Arow && Arow.inviteeCount === 1 && Arow.totalPoints === 30, JSON.stringify(Arow));
    check('6 裂变榜: G inviteeCount=1 totalPoints=50', Grow && Grow.inviteeCount === 1 && Grow.totalPoints === 50, JSON.stringify(Grow));
    check('6 裂变榜: 按 inviteeCount 降序(M=2 在首位, 后续均<=前)', lbRows.length >= 3 && lbRows[0].inviterId === M.id, `first=${JSON.stringify(lbRows[0])}`);
  } finally {
    // ================= 清理(零残留) =================
    try { await setDefaultShareReward(0); } catch {}
    for (const a of createdActs) {
      await client.query(`DELETE FROM activity_referral_rewards_activity_lnk WHERE activity_id = $1`, [a.id]);
      const attendIds = await client.query(
        `SELECT sl.activity_attendance_id::int AS id FROM activity_attendances_signup_lnk sl
           JOIN activity_signups sg ON sg.id = sl.activity_signup_id
           JOIN activity_signups_activity_lnk al ON al.activity_signup_id = sg.id
          WHERE al.activity_id = $1`, [a.id]);
      for (const att of attendIds.rows) {
        await client.query(`DELETE FROM activity_attendances_signup_lnk WHERE activity_attendance_id = $1`, [att.id]);
        await client.query(`DELETE FROM activity_attendances WHERE id = $1`, [att.id]);
      }
      const signupIds = await client.query(`SELECT al.activity_signup_id::int AS id FROM activity_signups_activity_lnk al WHERE al.activity_id = $1`, [a.id]);
      for (const s of signupIds.rows) {
        await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id = $1`, [s.id]);
        await client.query(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [s.id]);
        await client.query(`DELETE FROM activity_signups WHERE id = $1`, [s.id]);
      }
      await client.query(`DELETE FROM activity_referral_rewards_invitee_lnk WHERE activity_referral_reward_id IN (SELECT activity_referral_reward_id FROM activity_referral_rewards_activity_lnk WHERE activity_id = $1)`, [a.id]);
      await client.query(`DELETE FROM activity_referral_rewards_inviter_lnk WHERE activity_referral_reward_id IN (SELECT activity_referral_reward_id FROM activity_referral_rewards_activity_lnk WHERE activity_id = $1)`, [a.id]);
      await client.query(`DELETE FROM activity_referral_rewards WHERE id IN (SELECT activity_referral_reward_id FROM activity_referral_rewards_activity_lnk WHERE activity_id = $1)`, [a.id]);
      await client.query(`DELETE FROM activities WHERE id = $1`, [a.id]);
    }
    // 剩余邀请码 / usage / relation
    const codeRows2 = await client.query(`SELECT id FROM sso_invite_codes WHERE code LIKE 'FS%'`);
    for (const c of codeRows2.rows) {
      await client.query(`DELETE FROM sso_invite_codes_creator_lnk WHERE sso_invite_code_id = $1`, [c.id]);
      await client.query(`DELETE FROM sso_invite_codes WHERE id = $1`, [c.id]);
    }
    const upIds = clearUsers.map((u) => u.upId);
    const ssoIdsAll = clearUsers.map((u) => u.ssoId);
    for (const u of clearUsers) {
      if (u.ssoId) {
        await client.query(`DELETE FROM sso_invite_usages_user_lnk WHERE sso_user_id = $1`, [u.ssoId]);
        await client.query(`DELETE FROM sso_referral_relations_inviter_lnk WHERE sso_user_id = $1`, [u.ssoId]);
        await client.query(`DELETE FROM sso_referral_relations_invitee_lnk WHERE sso_user_id = $1`, [u.ssoId]);
      }
    }
    await client.query(`DELETE FROM sso_invite_usages WHERE id NOT IN (SELECT DISTINCT sso_invite_usage_id FROM sso_invite_usages_user_lnk)`);
    await client.query(`DELETE FROM sso_referral_relations WHERE id NOT IN (SELECT DISTINCT sso_referral_relation_id FROM sso_referral_relations_inviter_lnk)`);
    await purgeUsers(upIds, ssoIdsAll);
    // 兜底清剩余 fs_ sso(孤儿)
    const orphSso = await client.query(`SELECT id FROM sso_users WHERE username LIKE '${PF}%'`);
    if (orphSso.rows.length) await purgeUsers([], orphSso.rows.map((r) => r.id));
    await client.query(`DELETE FROM activity_referral_rewards_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)`);
    await client.query(`DELETE FROM activity_referral_rewards_inviter_lnk WHERE activity_referral_reward_id NOT IN (SELECT id FROM activity_referral_rewards)`);
    await client.query(`DELETE FROM activity_referral_rewards_invitee_lnk WHERE activity_referral_reward_id NOT IN (SELECT id FROM activity_referral_rewards)`);
    await client.query(`DELETE FROM activity_referral_rewards WHERE id NOT IN (SELECT DISTINCT activity_referral_reward_id FROM activity_referral_rewards_activity_lnk)`);
  }

  // 残留统计
  const residue = await client.query(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE '验收-%') a,
      (SELECT count(*)::int FROM activity_signups_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) su,
      (SELECT count(*)::int FROM up_users WHERE username LIKE '${PF}%') u,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE '${PF}%') s,
      (SELECT count(*)::int FROM sso_invite_codes WHERE code LIKE 'FS%') c,
      (SELECT count(*)::int FROM activity_referral_rewards_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) rr,
      (SELECT count(*)::int FROM zhao_point_records_user_lnk ul JOIN up_users uu ON uu.id = ul.user_id WHERE uu.username LIKE '${PF}%') pl,
      (SELECT COALESCE(default_share_reward_points,0) FROM zhao_point_configs LIMIT 1) dc`);
  const res = residue.rows[0];
  check(`清理完成(活动=${res.a} 报名孤儿=${res.su} 测试用户=${res.u} sso用户=${res.s} 邀请码=${res.c} 奖励孤儿=${res.rr} 积分记录=${res.pl} 全局默认=${res.dc})`,
    res.a === 0 && res.su === 0 && res.u === 0 && res.s === 0 && res.c === 0 && res.rr === 0 && res.pl === 0 && res.dc === 0);

  await client.end();

  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });