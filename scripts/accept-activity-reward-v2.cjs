/* 活动奖励权益 v2（递进式领取） 验收
 * 用法: cd e:\code\basic && node scripts/accept-activity-reward-v2.cjs
 * 覆盖(对齐实施计划 Task 12):
 *  1. 通道门槛四类 contact|survey|wechat_auth|subscribe：无数据不可领，补足后可领；unlockCheck 实时探测
 *  2. 权益五条件 none/wechat_auth/subscribe/contact/survey 独立判定
 *  3. selectMode 三态 all/one/any（any 限 selectN）
 *  4. 补填问卷解锁二次领取幂等（PUT questionnaire → newlyUnlocked + 积分到账；重复 PUT 不重复累加）
 *  5. 报名选填问卷 → activity_signup.questionnaireData 落库
 *  6. 旧数据兼容：infoChannels + loginRequired/channel 旧字段映射
 *  7. 零残留：活动/报名/点记录/sso 绑定/测试用户全部清理
 * 运行前置: 本地 Strapi develop(127.0.0.1:1337)已运行且 zhao-point 已重编译(accept 前先 npm run build)
 */
const { Client } = require('pg');
const crypto = require('crypto');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'aw2_'; // 测试用户名前缀

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
  return { id: user?.id || user?.documentId, username, token: tokenOf(j), raw: j };
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
/** 删除某用户全部点记录(含 lnk/channel) */
async function purgeUserPoints(userId) {
  const recIds = await q(`SELECT point_record_id::int AS id FROM zhao_point_records_user_lnk WHERE user_id = $1`, [userId]);
  for (const r of recIds) {
    await client.query(`DELETE FROM zhao_point_records_user_channel_lnk WHERE point_record_id = $1`, [r.id]);
    await client.query(`DELETE FROM zhao_point_records_user_lnk WHERE point_record_id = $1`, [r.id]);
    await client.query(`DELETE FROM zhao_point_records WHERE id = $1`, [r.id]);
  }
}
/** 删除某用户名的 sso 用户及其 wechat 绑定 */
async function purgeSsoOf(username) {
  const sso = await q(`SELECT id FROM sso_users WHERE username = $1`, [username]);
  for (const s of sso) {
    const bids = await q(`SELECT sso_third_party_binding_id::int AS id FROM sso_third_party_bindings_user_lnk WHERE sso_user_id = $1`, [s.id]);
    await client.query(`DELETE FROM sso_third_party_bindings_user_lnk WHERE sso_user_id = $1`, [s.id]);
    for (const b of bids) await client.query(`DELETE FROM sso_third_party_bindings WHERE id = $1`, [b.id]);
    await client.query(`DELETE FROM sso_users WHERE id = $1`, [s.id]);
  }
}
/** 用户奖励积分合计(action=activity_reward) */
async function userRewardPoints(userId) {
  const rows = await q(`SELECT COALESCE(sum(pr.points),0)::int AS s FROM zhao_point_records pr
    JOIN zhao_point_records_user_lnk ul ON ul.point_record_id = pr.id
    WHERE ul.user_id = $1 AND pr.action = 'activity_reward'`, [userId]);
  return rows[0]?.s ?? 0;
}
/** 用户 activity_reward 点记录条数（幂等断言用） */
async function userRewardRecordCount(userId) {
  const rows = await q(`SELECT count(*)::int AS c FROM zhao_point_records pr
    JOIN zhao_point_records_user_lnk ul ON ul.point_record_id = pr.id
    WHERE ul.user_id = $1 AND pr.action = 'activity_reward'`, [userId]);
  return rows[0]?.c ?? 0;
}

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');
  const ts = Date.now();
  const RND = Math.floor(Math.random() * 1e6);
  const nm = (s) => `${PF}${s}_${ts}_${RND}`;

  // ---- 预建积分规则 ----
  const ruleExists = await q(`SELECT id FROM zhao_point_rules WHERE "action" = 'activity_reward' AND deleted_at IS NULL`);
  if (!ruleExists.length) {
    await client.query(`INSERT INTO zhao_point_rules ("action", category, points, enabled, limit_per_day, description)
      VALUES ('activity_reward','increase',0,true,1000,'活动报名奖励(发放)')`);
  } else {
    await client.query(`UPDATE zhao_point_rules SET enabled=true, deleted_at=NULL WHERE "action"='activity_reward'`);
  }

  // ---- 清场(开头) ----
  const orphanSignups = await q(`SELECT id FROM activity_signups WHERE id NOT IN (SELECT activity_signup_id FROM activity_signups_activity_lnk)`);
  for (const o of orphanSignups) {
    await client.query(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [o.id]);
    await client.query(`DELETE FROM activity_signups WHERE id = $1`, [o.id]);
  }
  const acts = await q(`SELECT id FROM activities WHERE title LIKE '验收-%'`);
  for (const a of acts) {
    await purgeActivitySignups(a.id);
    await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_id = $1`, [a.id]);
    await client.query(`DELETE FROM activities WHERE id = $1`, [a.id]);
  }
  const upRows = await q(`SELECT id, username FROM up_users WHERE username LIKE '${PF}%'`);
  for (const u of upRows) {
    await purgeSsoOf(u.username);
    await purgeUserPoints(u.id);
    await client.query(`DELETE FROM up_users WHERE id = $1`, [u.id]);
  }

  // ---- admin 登录 ----
  const adminLogin = await waitForServer();
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 80));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  // ---- 共享配置 ----
  const formConfig = [
    { key: 'name', label: '姓名', type: 'text' },
    { key: 'phone', label: '手机号', type: 'phone', required: true },
  ];
  const questionnaire = {
    enabled: true,
    title: '调查问卷',
    fields: [{ key: 'sat', label: '满意度', type: 'radio', options: ['满意', '一般'] }],
  };
  const mkAct = (title, cfg) => api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken, body: { title, description: title, capacity: 100, status: 'signup_open', ...cfg },
  });
  const signupAs = (token, activityId, formData, chosenRewards, questionnaireData) => api('POST', '/zhao-point/v1/my/activity/signup', {
    token, body: { activityId, formData, chosenRewards, questionnaireData },
  });
  /** 预插 sso 用户 + wechat 绑定（subscribe 控制关注状态缓存值） */
  async function preBindWechat(username, subscribe = 0) {
    let sso = (await q(`SELECT id FROM sso_users WHERE username = $1`, [username]))[0];
    if (!sso) {
      sso = (await q(`INSERT INTO sso_users (uuid, username, status, login_count)
        VALUES ($1, $2, 'active', 0) RETURNING id::int AS id`, [`acc_${ts}_${RND}`, username]))[0];
    }
    const b = (await q(`INSERT INTO sso_third_party_bindings (provider, provider_user_id, bound_at, subscribe)
      VALUES ('wechat', $1, now(), $2) RETURNING id::int AS id`, [`wx_${ts}_${RND}`, subscribe ? 1 : 0]))[0];
    await client.query(`INSERT INTO sso_third_party_bindings_user_lnk (sso_third_party_binding_id, sso_user_id) VALUES ($1,$2)`, [b.id, sso.id]);
    return { ssoId: sso.id, bindingId: b.id };
  }

  // ================== 测试 1：通道门槛四类 ==================
  console.log('\n--- 测试 1：通道门槛四类 ---');
  const cReward = () => [{ id: 'c1', type: 'points', name: '通道奖励', amount: 10, mode: 'single', condition: 'none' }];
  const chanActs = {};
  for (const ch of ['contact', 'survey', 'wechat_auth', 'subscribe']) {
    const cfg = { formConfig, rewardConfig: { loginEnabled: true, channel: { type: ch, label: ch }, selectMode: 'all', rewards: cReward() } };
    if (ch === 'survey') cfg.questionnaire = questionnaire;
    const a = await mkAct(`验收-v2通道-${ch}`, cfg);
    chanActs[ch] = a.json?.data;
  }
  check('建 4 个通道活动成功', ['contact','survey','wechat_auth','subscribe'].every((c) => chanActs[c]?.documentId),
    JSON.stringify(['contact','survey','wechat_auth','subscribe'].map((c) => chanActs[c]?.documentId)));
  if (!['contact','survey','wechat_auth','subscribe'].every((c) => chanActs[c]?.documentId)) { console.error('建活动失败，终止'); process.exit(1); }

  const u_noop = await register(nm('noop'));
  check('注册 u_noop', !!u_noop.token);
  // 无任何数据 → 4 通道均 channelDone=false、不可领
  for (const ch of ['contact', 'survey', 'wechat_auth', 'subscribe']) {
    const r = await signupAs(u_noop.token, chanActs[ch].documentId, {}, []);
    const d = r.json?.data || {};
    check(`[${ch}] u_noop channelDone=false`, r.status === 200 && d.ok === true && d.unlockInfo?.channelDone === false, `${r.status} ${JSON.stringify(d.unlockInfo)}`);
    check(`[${ch}] u_noop chosenRewards 为空`, Array.isArray(d.unlockInfo?.chosenRewards) && d.unlockInfo.chosenRewards.length === 0, JSON.stringify(d.unlockInfo?.chosenRewards));
    check(`[${ch}] u_noop 无 granted`, Array.isArray(d.granted) && d.granted.length === 0, JSON.stringify(d.granted));
  }
  check('u_noop 累计 activity_reward 积分=0', (await userRewardPoints(u_noop.id)) === 0, `sum=${await userRewardPoints(u_noop.id)}`);

  // 各自补足通道后报名 → channelDone=true、可领
  const u_contact = await register(nm('contact'));
  const rC = await signupAs(u_contact.token, chanActs.contact.documentId, { name: '甲', phone: '13800000001' }, []);
  const dC = rC.json?.data || {};
  check('[contact] 补电话 channelDone=true', rC.status === 200 && dC.unlockInfo?.channelDone === true, JSON.stringify(dC.unlockInfo));
  check('[contact] granted 含 c1 且积分+10', (dC.granted || []).some((x) => x.id === 'c1' && /积分 \+10/.test(x.message || '')), JSON.stringify(dC.granted));
  check('[contact] u_contact 积分=10', (await userRewardPoints(u_contact.id)) === 10, `sum=${await userRewardPoints(u_contact.id)}`);

  const u_survey = await register(nm('survey'));
  const rS = await signupAs(u_survey.token, chanActs.survey.documentId, {}, [], { sat: '满意' });
  const dS = rS.json?.data || {};
  check('[survey] 补问卷 channelDone=true', rS.status === 200 && dS.unlockInfo?.channelDone === true, JSON.stringify(dS.unlockInfo));
  check('[survey] granted 含 c1', (dS.granted || []).some((x) => x.id === 'c1'), JSON.stringify(dS.granted));

  const u_wx = await register(nm('wxauth'));
  await preBindWechat(u_wx.username, 0);
  const rW = await signupAs(u_wx.token, chanActs.wechat_auth.documentId, {}, []);
  const dW = rW.json?.data || {};
  check('[wechat_auth] 预插绑定 loginAuth=true', dW.unlockInfo?.loginAuth === true, JSON.stringify(dW.unlockInfo));
  check('[wechat_auth] channelDone=true', rW.status === 200 && dW.unlockInfo?.channelDone === true, JSON.stringify(dW.unlockInfo));
  check('[wechat_auth] granted 含 c1', (dW.granted || []).some((x) => x.id === 'c1'), JSON.stringify(dW.granted));

  const u_sub = await register(nm('subbed'));
  await preBindWechat(u_sub.username, 1);
  const rSub = await signupAs(u_sub.token, chanActs.subscribe.documentId, {}, []);
  const dSub = rSub.json?.data || {};
  check('[subscribe] 预插绑定 subscribe=1 subscribed=true', dSub.unlockInfo?.subscribed === true, JSON.stringify(dSub.unlockInfo));
  check('[subscribe] channelDone=true', rSub.status === 200 && dSub.unlockInfo?.channelDone === true, JSON.stringify(dSub.unlockInfo));
  check('[subscribe] granted 含 c1', (dSub.granted || []).some((x) => x.id === 'c1'), JSON.stringify(dSub.granted));

  // unlockCheck 实时探测
  const uc_noop = await api('POST', `/zhao-point/v1/my/activity/${chanActs.subscribe.documentId}/unlock-check`, { token: u_noop.token, body: {} });
  const un_noop = uc_noop.json?.data || {};
  check('unlockCheck u_noop: subscribed=false channelDone=false', uc_noop.status === 200 && un_noop.subscribed === false && un_noop.channelDone === false, JSON.stringify(un_noop));
  const uc_sub = await api('POST', `/zhao-point/v1/my/activity/${chanActs.subscribe.documentId}/unlock-check`, { token: u_sub.token, body: {} });
  const un_sub = uc_sub.json?.data || {};
  check('unlockCheck u_sub: subscribed=true channelDone=true rewards[0].unlocked=true',
    uc_sub.status === 200 && un_sub.subscribed === true && un_sub.channelDone === true && un_sub.rewards?.[0]?.unlocked === true, JSON.stringify(un_sub));

  // ================== 测试 2：权益五条件独立判定 ==================
  console.log('\n--- 测试 2：权益五条件 ---');
  const condRewards = [
    { id: 'n', type: 'points', name: '无条件', amount: 5, mode: 'single', condition: 'none' },
    { id: 'wa', type: 'points', name: '微信授权', amount: 6, mode: 'single', condition: 'wechat_auth' },
    { id: 'sb', type: 'points', name: '关注公众号', amount: 7, mode: 'single', condition: 'subscribe' },
    { id: 'ct', type: 'points', name: '留联系方式', amount: 8, mode: 'single', condition: 'contact' },
    { id: 'sv', type: 'points', name: '回答问卷', amount: 9, mode: 'single', condition: 'survey' },
  ];
  const aCond = await mkAct('验收-v2条件', { formConfig, questionnaire, rewardConfig: { loginEnabled: true, channel: { type: 'contact', label: '留联系方式' }, selectMode: 'all', rewards: condRewards } });
  const actCond = aCond.json?.data;
  check('建条件活动成功', !!actCond?.documentId);
  if (!actCond) { console.error('建条件活动失败，终止'); process.exit(1); }

  const u_none = await register(nm('condnone'));
  const rN = await signupAs(u_none.token, actCond.documentId, { name: '乙', phone: '13800000002' }, []);
  const dN = rN.json?.data || {};
  const gN = (dN.granted || []).map((x) => x.id).sort();
  check('[五条件] 仅电话者 解锁 n+ct', JSON.stringify(gN) === JSON.stringify(['ct', 'n']), JSON.stringify(gN));
  check('[五条件] 未解锁 wa/sb/sv', !gN.includes('wa') && !gN.includes('sb') && !gN.includes('sv'), JSON.stringify(gN));
  check('[五条件] u_none 积分=13(5+8)', (await userRewardPoints(u_none.id)) === 13, `sum=${await userRewardPoints(u_none.id)}`);

  const u_full = await register(nm('condfull'));
  await preBindWechat(u_full.username, 1);
  const rF = await signupAs(u_full.token, actCond.documentId, { name: '丙', phone: '13800000003' }, [], { sat: '满意' });
  const dF = rF.json?.data || {};
  const gF = (dF.granted || []).map((x) => x.id).sort();
  check('[五条件] 全满足者 解锁全部五项', JSON.stringify(gF) === JSON.stringify(['ct', 'n', 'sb', 'sv', 'wa']), JSON.stringify(gF));
  check('[五条件] u_full 积分=35(5+6+7+8+9)', (await userRewardPoints(u_full.id)) === 35, `sum=${await userRewardPoints(u_full.id)}`);

  // ================== 测试 3：selectMode 三态 ==================
  console.log('\n--- 测试 3：selectMode 三态 ---');
  const multiRewards = [
    { id: 'm1', type: 'points', name: 'M1', amount: 1, mode: 'multi' },
    { id: 'm2', type: 'points', name: 'M2', amount: 2, mode: 'multi' },
    { id: 'm3', type: 'points', name: 'M3', amount: 3, mode: 'multi' },
  ];
  const mkModeAct = async (title, mode, selectN) => {
    const a = await mkAct(title, { formConfig, rewardConfig: { loginEnabled: true, channel: { type: 'contact', label: '留联系方式' }, selectMode: mode, selectN, rewards: multiRewards } });
    return a.json?.data;
  };
  const actAll = await mkModeAct('验收-v2全选', 'all', undefined);
  const actOne = await mkModeAct('验收-v2单选', 'one', undefined);
  const actAny = await mkModeAct('验收-v2任选', 'any', 2);
  check('建 selectMode 三活动成功', !!actAll?.documentId && !!actOne?.documentId && !!actAny?.documentId);
  if (!actAll || !actOne || !actAny) { console.error('建活动失败，终止'); process.exit(1); }

  const u_all = await register(nm('modeall'));
  const rAll = await signupAs(u_all.token, actAll.documentId, { name: '丁', phone: '13800000004' }, []);
  const dAll = rAll.json?.data || {};
  const csAll = (dAll.unlockInfo?.chosenRewards || []).sort();
  check('[all] chosenRewards 含 m1/m2/m3', JSON.stringify(csAll) === JSON.stringify(['m1', 'm2', 'm3']), JSON.stringify(csAll));
  check('[all] 积分=6(1+2+3)', (await userRewardPoints(u_all.id)) === 6, `sum=${await userRewardPoints(u_all.id)}`);

  const u_one = await register(nm('modeone'));
  const rOne = await signupAs(u_one.token, actOne.documentId, { name: '戊', phone: '13800000005' }, ['m1', 'm2', 'm3']);
  const dOne = rOne.json?.data || {};
  const csOne = dOne.unlockInfo?.chosenRewards || [];
  check('[one] chosenRewards 截断为 1 个', csOne.length === 1 && csOne[0] === 'm1', JSON.stringify(csOne));
  check('[one] 积分=1', (await userRewardPoints(u_one.id)) === 1, `sum=${await userRewardPoints(u_one.id)}`);

  const u_any = await register(nm('modeany'));
  const rAny = await signupAs(u_any.token, actAny.documentId, { name: '己', phone: '13800000006' }, ['m1', 'm2', 'm3']);
  const dAny = rAny.json?.data || {};
  const csAny = (dAny.unlockInfo?.chosenRewards || []).sort();
  check('[any] selectN=2 截断为 2 个', JSON.stringify(csAny) === JSON.stringify(['m1', 'm2']), JSON.stringify(csAny));
  check('[any] 积分=3(1+2)', (await userRewardPoints(u_any.id)) === 3, `sum=${await userRewardPoints(u_any.id)}`);

  // ================== 测试 4：补填问卷解锁二次领取幂等 ==================
  console.log('\n--- 测试 4：补填问卷解锁 + 幂等 ---');
  const aFill = await mkAct('验收-v2补填问卷', { questionnaire, rewardConfig: { loginEnabled: true, channel: { type: 'survey', label: '回答调查问卷' }, selectMode: 'all', rewards: [{ id: 'f1', type: 'points', name: '问卷解锁奖励', amount: 20, mode: 'multi', condition: 'survey' }] } });
  const actFill = aFill.json?.data;
  check('建补填活动成功', !!actFill?.documentId);
  if (!actFill) { console.error('建活动失败，终止'); process.exit(1); }

  const u_fill = await register(nm('fill'));
  const rF1 = await signupAs(u_fill.token, actFill.documentId, {}, []);
  const dF1 = rF1.json?.data || {};
  check('[补填] 报名未填问卷 channelDone=false 且不发放', dF1.unlockInfo?.channelDone === false && (dF1.granted || []).length === 0, JSON.stringify(dF1.unlockInfo));
  check('[补填] 未发放前积分=0', (await userRewardPoints(u_fill.id)) === 0, `sum=${await userRewardPoints(u_fill.id)}`);
  const signupId = dF1.signupId;
  check('[补填] 报名返回 signupId', typeof signupId === 'number' && signupId > 0, `signupId=${signupId}`);

  const pf1 = await api('PUT', `/zhao-point/v1/my/activity/signup/${signupId}/questionnaire`, { token: u_fill.token, body: { answers: { sat: '满意' } } });
  const df1 = pf1.json?.data || {};
  check('[补填] PUT 问卷 ok', pf1.status === 200 && df1.ok === true, `${pf1.status} ${JSON.stringify(pf1.json)}`);
  check('[补填] newlyUnlocked 含 f1', Array.isArray(df1.newlyUnlocked) && df1.newlyUnlocked.some((x) => x.id === 'f1'), JSON.stringify(df1.newlyUnlocked));
  check('[补填] unlockInfo.channelDone=true', df1.unlockInfo?.channelDone === true && df1.unlockInfo?.conditions?.survey === true, JSON.stringify(df1.unlockInfo));
  check('[补填] 积分=20(到账)', (await userRewardPoints(u_fill.id)) === 20, `sum=${await userRewardPoints(u_fill.id)}`);
  const rec1 = await userRewardRecordCount(u_fill.id);

  const pf2 = await api('PUT', `/zhao-point/v1/my/activity/signup/${signupId}/questionnaire`, { token: u_fill.token, body: { answers: { sat: '满意' } } });
  const df2 = pf2.json?.data || {};
  check('[补填] 重复 PUT newlyUnlocked 为空(幂等)', pf2.status === 200 && df2.ok === true && Array.isArray(df2.newlyUnlocked) && df2.newlyUnlocked.length === 0, JSON.stringify(df2.newlyUnlocked));
  check('[补填] 重复 PUT 积分仍=20(不重复累加)', (await userRewardPoints(u_fill.id)) === 20 && (await userRewardRecordCount(u_fill.id)) === rec1,
    `sum=${await userRewardPoints(u_fill.id)} rec=${await userRewardRecordCount(u_fill.id)}(前${rec1})`);

  // ================== 测试 5：报名选填问卷落库 ==================
  console.log('\n--- 测试 5：报名选填问卷 ---');
  const aOpt = await mkAct('验收-v2选填问卷', { formConfig, questionnaire, rewardConfig: { loginEnabled: true, channel: { type: 'contact', label: '留联系方式' }, selectMode: 'all', rewards: cReward() } });
  const actOpt = aOpt.json?.data;
  check('建选填活动成功', !!actOpt?.documentId);
  const u_opt = await register(nm('opt'));
  const rOpt = await signupAs(u_opt.token, actOpt.documentId, { name: '庚', phone: '13800000007' }, [], { sat: '一般' });
  const dOpt = rOpt.json?.data || {};
  check('[选填] 报名 ok', rOpt.status === 200 && dOpt.ok === true, `${rOpt.status} ${JSON.stringify(rOpt.json)}`);
  const qdRow = await q(`SELECT questionnaire_data::text AS qd FROM activity_signups WHERE id = $1`, [dOpt.signupId]);
  check('[选填] questionnaireData 落库', !!qdRow[0]?.qd && qdRow[0].qd.includes('"sat"'), JSON.stringify(qdRow[0]?.qd));

  // ================== 测试 6：旧数据兼容迁移 ==================
  console.log('\n--- 测试 6：旧数据兼容 ---');
  const legacyRewardConfig = {
    loginEnabled: true,
    infoChannels: [{ channel: 'contact', label: '留联系方式' }],
    rewards: [
      { id: 'l1', type: 'points', name: '旧授权', amount: 11, mode: 'single', loginRequired: true },
      { id: 'l2', type: 'points', name: '旧联系', amount: 12, mode: 'single', channel: 'contact' },
      { id: 'l3', type: 'points', name: '旧无', amount: 13, mode: 'single' },
    ],
  };
  const aLeg = await mkAct('验收-v2旧数据', { formConfig, rewardConfig: legacyRewardConfig });
  const actLeg = aLeg.json?.data;
  check('建旧数据活动成功', !!actLeg?.documentId);
  if (!actLeg) { console.error('建活动失败，终止'); process.exit(1); }

  const u_legNoop = await register(nm('legnoop'));
  const rL1 = await signupAs(u_legNoop.token, actLeg.documentId, { name: '辛', phone: '13800000008' }, []);
  const dL1 = rL1.json?.data || {};
  const gL1 = (dL1.granted || []).map((x) => x.id).sort();
  check('[旧] 通道解析为 contact(channelDone=true)', dL1.unlockInfo?.channelDone === true, JSON.stringify(dL1.unlockInfo));
  check('[旧] 未授权者 解锁 l2+l3(loginRequired 不触发)', JSON.stringify(gL1) === JSON.stringify(['l2', 'l3']), JSON.stringify(gL1));
  check('[旧] u_legNoop 积分=25(12+13)', (await userRewardPoints(u_legNoop.id)) === 25, `sum=${await userRewardPoints(u_legNoop.id)}`);

  const u_legWx = await register(nm('legwx'));
  await preBindWechat(u_legWx.username, 0);
  const rL2 = await signupAs(u_legWx.token, actLeg.documentId, { name: '壬', phone: '13800000009' }, []);
  const dL2 = rL2.json?.data || {};
  const gL2 = (dL2.granted || []).map((x) => x.id).sort();
  check('[旧] 授权者 loginAuth=true 触发 l1(loginRequired)', dL2.unlockInfo?.loginAuth === true, JSON.stringify(dL2.unlockInfo));
  check('[旧] 授权者 解锁 l1+l2+l3', JSON.stringify(gL2) === JSON.stringify(['l1', 'l2', 'l3']), JSON.stringify(gL2));
  check('[旧] u_legWx 积分=36(11+12+13)', (await userRewardPoints(u_legWx.id)) === 36, `sum=${await userRewardPoints(u_legWx.id)}`);

  // ================== 清理(零残留) ==================
  console.log('\n--- 清理 ---');
  const allActs = [chanActs.contact, chanActs.survey, chanActs.wechat_auth, chanActs.subscribe, actCond, actAll, actOne, actAny, actFill, actOpt, actLeg];
  for (const a of allActs) {
    const row = await q(`SELECT id FROM activities WHERE id = $1`, [a.id]);
    if (!row.length) continue;
    await purgeActivitySignups(a.id);
    await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_id = $1`, [a.id]);
    await client.query(`DELETE FROM activities WHERE id = $1`, [a.id]);
  }
  const allUsers = [u_noop, u_contact, u_survey, u_wx, u_sub, u_none, u_full, u_all, u_one, u_any, u_fill, u_opt, u_legNoop, u_legWx];
  for (const u of allUsers) {
    await purgeSsoOf(u.username);
    await purgeUserPoints(u.id);
    await client.query(`DELETE FROM up_users WHERE id = $1`, [u.id]);
  }

  const residue = await q(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE '验收-%') a,
      (SELECT count(*)::int FROM activity_signups_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) su,
      (SELECT count(*)::int FROM activity_signups WHERE id NOT IN (SELECT activity_signup_id FROM activity_signups_activity_lnk)) sp,
      (SELECT count(*)::int FROM up_users WHERE username LIKE '${PF}%') u,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE '${PF}%') ss,
      (SELECT count(*)::int FROM zhao_point_records_user_lnk ul JOIN up_users uu ON uu.id = ul.user_id WHERE uu.username LIKE '${PF}%') pl`);
  const res = residue[0];
  check(`清理完成(活动=${res.a} 孤儿报名=${res.su} 孤儿记录=${res.sp} 测试用户=${res.u} sso用户=${res.ss} 点记录=${res.pl})`,
    res.a === 0 && res.su === 0 && res.sp === 0 && res.u === 0 && res.ss === 0 && res.pl === 0);

  await client.end();
  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
