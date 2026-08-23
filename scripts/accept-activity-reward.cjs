/* 活动报名引导与奖励发放 验收
 * 用法: cd e:\code\basic && node scripts/accept-activity-reward.cjs
 * 覆盖(对齐实施计划 Task 3/4/6):
 *  1. u1(无 sso 绑定, 静默): 留联系方式解锁 → 单选 points 自动发 + 多选 course_outline 选发
 *  2. loginRequired 门控: u1(loginAuth=false) 的授权专属奖励不发放(不在 granted/chosenRewards)
 *  3. u2(sso 绑定 wechat, 授权): loginAuth=true → loginRequired 奖励 r5 发放, 积分 99 到账
 *  4. idempotency: 重复报名 already_signed_up, activity_reward 积分不重复累加
 *  5. coupon: 关联真实优惠券单发 → granted 返回 promoLink + '已领取优惠券' 文案
 *  6. 回归: 无 rewardConfig 活动必填(phone) 仍 400 拦截
 *  7. 零残留: 活动/报名/点记录/优惠券/sso 绑定/测试用户 全部清理
 * 运行前置: 本地 Strapi develop(127.0.0.1:1337)已运行且 zhao-point 已重编译(accept 前先 npm run build)
 */
const { Client } = require('pg');
const crypto = require('crypto');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'awd_'; // 测试用户名前缀

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

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');
  const ts = Date.now();
  const RND = Math.floor(Math.random() * 1e6);
  const nm = (s) => `${PF}${s}_${ts}_${RND}`;

  // ---- 预建积分规则: activity_reward 不在默认规则中, 需先建否则 earnPoints 抛 POINT_001 ----
  const ruleExists = await q(`SELECT id FROM zhao_point_rules WHERE "action" = 'activity_reward' AND deleted_at IS NULL`);
  if (!ruleExists.length) {
    await client.query(`INSERT INTO zhao_point_rules ("action", category, points, enabled, limit_per_day, description)
      VALUES ('activity_reward','increase',0,true,1000,'活动报名奖励(发放)')`);
  } else {
    await client.query(`UPDATE zhao_point_rules SET enabled=true, deleted_at=NULL WHERE "action"='activity_reward'`);
  }

  // ---- 清场(开头): 验收活动 + 优惠券 + 测试用户(含 sso 绑定/点记录) + 通用孤儿报名 ----
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
  await client.query(`DELETE FROM zhao_deal_coupons WHERE coupon_id LIKE 'accept_cpn_%'`);
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

  // ---- 建优惠券 ----
  const cpnNo = `accept_cpn_${ts}_${RND}`;
  const cpnRow = await q(`INSERT INTO zhao_deal_coupons (coupon_id, amount_desc, promo_link, receive_count, used_count)
    VALUES ($1, '满100减20', 'https://example.com/coupon/' || $2, 0, 0) RETURNING id::int AS id`, [cpnNo, RND]);
  const cpnId = cpnRow[0]?.id;

  // ---- 建活动 ----
  // act1: rewardConfig(contact 通道 + points单发 + outline多选 + loginRequired单发) ; formConfig 含 channel:contact 的 phone
  const formConfig = [
    { key: 'name', label: '姓名', type: 'text' },
    { key: 'phone', label: '手机号', type: 'phone', channel: 'contact', required: true },
  ];
  const rewardConfig = {
    loginEnabled: true,
    infoChannels: [{ channel: 'contact', label: '留联系方式' }],
    rewards: [
      { id: 'r1', type: 'points', name: '报名积分', amount: 50, mode: 'single' },
      { id: 'r3', type: 'course_outline', name: '课前培训大纲', kind: 'article', mode: 'multi', link: 'https://example.com/outline' },
      { id: 'r5', type: 'points', name: '授权专属积分', amount: 99, mode: 'single', loginRequired: true },
    ],
  };
  const mkAct = (title, cfg) => api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken, body: { title, description: title, capacity: 100, status: 'signup_open', ...cfg },
  });
  const a1 = await mkAct('验收-奖励活动', { formConfig, rewardConfig });
  const act1 = a1.json?.data;
  const a2 = await mkAct('验收-无奖励活动', { formConfig });
  const act2 = a2.json?.data;
  const a3 = await mkAct('验收-优惠券活动', { rewardConfig: { loginEnabled: true, infoChannels: [], rewards: [{ id: 'rn', type: 'coupon', name: '优惠券', couponId: cpnId, mode: 'single' }] } });
  const act3 = a3.json?.data;
  check('建活动 act1/act2/act3 成功', a1.status === 200 && !!act1?.documentId && a2.status === 200 && !!act2?.documentId && a3.status === 200 && !!act3?.documentId, JSON.stringify([a1.status, a2.status, a3.status]));
  if (!act1 || !act2 || !act3) { console.error('建活动失败，终止'); process.exit(1); }

  // ---- 测试用户 ----
  const u1 = await register(nm('u1next'));
  const u2 = await register(nm('u2auth'));
  check('注册用户 u1/u2 拿到 token', !!u1.id && !!u1.token && !!u2.id && !!u2.token, `u1=${u1.id} u2=${u2.id}`);

  // u2: 预插 sso 用户 + provider=wechat 绑定 → loginAuth=true
  let ssoId = null;
  try {
    let sso = (await q(`SELECT id FROM sso_users WHERE username = $1`, [u2.username]))[0];
    if (!sso) {
      sso = (await q(`INSERT INTO sso_users (uuid, username, status, login_count)
        VALUES ($1, $2, 'active', 0) RETURNING id::int AS id`, [`acc_${ts}_${RND}`, u2.username]))[0];
    }
    ssoId = sso.id;
    const b = (await q(`INSERT INTO sso_third_party_bindings (provider, provider_user_id, bound_at)
      VALUES ('wechat', $1, now()) RETURNING id::int AS id`, [`wx_${ts}_${RND}`]))[0];
    await client.query(`INSERT INTO sso_third_party_bindings_user_lnk (sso_third_party_binding_id, sso_user_id) VALUES ($1,$2)`, [b.id, sso.id]);
    check('u2 sso+wechat 绑定预插成功', !!ssoId, `sso=${ssoId}`);
  } catch (e) {
    check('u2 sso+wechat 绑定预插成功', false, e.message);
  }

  const signupAs = (token, activityId, formData, chosenRewards) => api('POST', '/zhao-point/v1/my/activity/signup', {
    token, body: { activityId, formData, chosenRewards },
  });

  // ---------- u1 静默路径(loginAuth=false) ----------
  const r1 = await signupAs(u1.token, act1.documentId, { name: '张三', phone: '13800138000' }, ['r3']);
  const d1 = r1.json?.data || {};
  check('u1 signup ok', r1.status === 200 && d1.ok === true, `${r1.status} ${JSON.stringify(r1.json)}`);
  check('u1 loginAuth=false(无绑定)', d1.unlockInfo?.loginAuth === false, JSON.stringify(d1.unlockInfo));
  check('u1 channels.contact=true', d1.unlockInfo?.channels?.contact === true, JSON.stringify(d1.unlockInfo?.channels));
  check('u1 chosenRewards 含 r1(单选自动)与 r3(多选自选)', d1.unlockInfo?.chosenRewards?.includes('r1') && d1.unlockInfo?.chosenRewards?.includes('r3'), JSON.stringify(d1.unlockInfo?.chosenRewards));
  check('u1 不含 r5(loginRequired 未解锁)', !d1.unlockInfo?.chosenRewards?.includes('r5'), JSON.stringify(d1.unlockInfo?.chosenRewards));
  const g1 = d1.granted || [];
  check('u1 granted 含 r1(积分+50)', g1.some((x) => x.id === 'r1' && /积分 \+50/.test(x.message || '')), JSON.stringify(g1));
  check('u1 granted 含 r3(大纲+link)', g1.some((x) => x.id === 'r3' && x.link === 'https://example.com/outline'), JSON.stringify(g1));
  check('u1 granted 不含 r5', !g1.some((x) => x.id === 'r5'), JSON.stringify(g1));
  check('u1 activity_reward 积分=50', (await userRewardPoints(u1.id)) === 50, `sum=${await userRewardPoints(u1.id)}`);

  // ---------- 幂等: 重复报名 ----------
  const r1b = await signupAs(u1.token, act1.documentId, { name: '张三', phone: '13800138000' }, ['r3']);
  check('u1 重复报名 already_signed_up', r1b.json?.data?.reason === 'already_signed_up', JSON.stringify(r1b.json));
  check('u1 重复后积分仍=50(不重复发)', (await userRewardPoints(u1.id)) === 50, `sum=${await userRewardPoints(u1.id)}`);

  // ---------- u2 授权路径(loginAuth=true) ----------
  const r2 = await signupAs(u2.token, act1.documentId, { name: '李四', phone: '13900139000' }, []);
  const d2 = r2.json?.data || {};
  check('u2 signup ok', r2.status === 200 && d2.ok === true, `${r2.status} ${JSON.stringify(r2.json)}`);
  check('u2 loginAuth=true(wechat 绑定)', d2.unlockInfo?.loginAuth === true, JSON.stringify(d2.unlockInfo));
  check('u2 chosenRewards 含 r1 与 r5(普通单发+授权单发均自动)', d2.unlockInfo?.chosenRewards?.includes('r1') && d2.unlockInfo?.chosenRewards?.includes('r5'), JSON.stringify(d2.unlockInfo?.chosenRewards));
  check('u2 chosenRewards 不含 r3(未选 multi)', !d2.unlockInfo?.chosenRewards?.includes('r3'), JSON.stringify(d2.unlockInfo?.chosenRewards));
  const g2 = d2.granted || [];
  check('u2 granted 含 r1 与 r5', g2.some((x) => x.id === 'r1') && g2.some((x) => x.id === 'r5'), JSON.stringify(g2));
  check('u2 activity_reward 积分=149(50+99)', (await userRewardPoints(u2.id)) === 149, `sum=${await userRewardPoints(u2.id)}`);

  // ---------- coupon 发放在 act3 ----------
  const r3 = await signupAs(u1.token, act3.documentId, { name: '王五' }, []);
  const d3 = r3.json?.data || {};
  const g3 = d3.granted || [];
  const cpnGrant = g3.find((x) => x.id === 'rn');
  check('coupon signup ok', r3.status === 200 && d3.ok === true, JSON.stringify(r3.json));
  check('coupon granted 含 rn 且带 promoLink', !!cpnGrant && cpnGrant.link === 'https://example.com/coupon/' + RND, JSON.stringify(g3));
  check('coupon message 含 已领取优惠券', !!cpnGrant && /已领取优惠券/.test(cpnGrant.message || ''), JSON.stringify(cpnGrant));

  // ---------- 回归: 无 rewardConfig 必填拦截 ----------
  const r4 = await signupAs(u1.token, act2.documentId, { name: '赵六' }, []);
  const e4 = r4.json?.errors || [];
  check('回归: 无奖励活动必填 phone 仍 400 拦截', r4.status === 400 && e4.some((x) => x.key === 'phone'), `${r4.status} ${JSON.stringify(r4.json)}`);

  // ---------- 名单接口返回 unlockInfo ----------
  const signs = await api('GET', `/zhao-point/v1/admin/adm/activities/${act1.documentId}/signups`, { token: adminToken });
  const signsArr = Array.isArray(signs.json?.data) ? signs.json.data : [];
  const m1 = signsArr.find((s) => s.formData?.name === '张三');
  const m2 = signsArr.find((s) => s.formData?.name === '李四');
  check('名单返回 u1 unlockInfo', !!m1?.unlockInfo && m1.unlockInfo.loginAuth === false && m1.unlockInfo.channels?.contact === true, JSON.stringify(m1?.unlockInfo));
  check('名单返回 u2 unlockInfo(loginAuth=true)', !!m2?.unlockInfo && m2.unlockInfo.loginAuth === true, JSON.stringify(m2?.unlockInfo));

  // ---------- 清理(零残留) ----------
  for (const a of [act1, act2, act3]) {
    const row = await q(`SELECT id FROM activities WHERE id = $1`, [a.id]);
    if (!row.length) continue;
    await purgeActivitySignups(a.id);
    await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_id = $1`, [a.id]);
    await client.query(`DELETE FROM activities WHERE id = $1`, [a.id]);
  }
  await client.query(`DELETE FROM zhao_deal_coupons WHERE coupon_id LIKE 'accept_cpn_%'`);
  for (const u of [u1, u2]) {
    await purgeSsoOf(u.username);
    await purgeUserPoints(u.id);
    await client.query(`DELETE FROM up_users WHERE id = $1`, [u.id]);
  }

  const residue = await q(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE '验收-%') a,
      (SELECT count(*)::int FROM activity_signups_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) su,
      (SELECT count(*)::int FROM activity_signups WHERE id NOT IN (SELECT activity_signup_id FROM activity_signups_activity_lnk)) sp,
      (SELECT count(*)::int FROM zhao_deal_coupons WHERE coupon_id LIKE 'accept_cpn_%') cp,
      (SELECT count(*)::int FROM up_users WHERE username LIKE '${PF}%') u,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE '${PF}%') ss,
      (SELECT count(*)::int FROM zhao_point_records_user_lnk ul JOIN up_users uu ON uu.id = ul.user_id WHERE uu.username LIKE '${PF}%') pl`);
  const res = residue[0];
  check(`清理完成(活动=${res.a} 孤儿报名=${res.su} 孤儿记录=${res.sp} 优惠券=${res.cp} 测试用户=${res.u} sso用户=${res.ss} 点记录=${res.pl})`,
    res.a === 0 && res.su === 0 && res.sp === 0 && res.cp === 0 && res.u === 0 && res.ss === 0 && res.pl === 0);

  await client.end();
  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });