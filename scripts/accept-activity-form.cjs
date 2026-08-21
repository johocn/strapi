/* 活动报名表单信息收集 验收
 * 用法: cd e:\code\basic && node scripts/accept-activity-form.cjs
 * 覆盖(对齐实施计划 Task 4):
 *  1. 带 formConfig 活动: 必填缺失数 400 + errors 含 phone/level
 *  2. phone 格式错 400 + errors 含 phone
 *  3. number(count) 越界 400 + errors 含 count
 *  4. multi(topic) 非法选项 400 + errors 含 topic
 *  5. 合法 formData 报名 ok + extra 被丢弃(名单返回 count=2 数字、topic 数组、无 extra)
 *  6. 名单接口(/adm/activities/:docId/signups)返回 formData
 *  7. 我的报名(/my/activities)返回 formData
 *  8. 无 formConfig 活动兼容报名 ok
 *  9. 零残留
 * 运行前置: 本地 Strapi develop(127.0.0.1:1337)已运行且 zhao-point 已重编译(accept 前先 npm run build)
 */
const { Client } = require('pg');
const crypto = require('crypto');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'afm_'; // 测试用户名前缀

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

// 清理某个活动及其关联报名(activity_signups_activity_lnk / user_lnk / activity_signups / 报名收费点记录)
async function purgeActivitySignups(actId) {
  const ss = await q(`SELECT activity_signup_id::int AS id FROM activity_signups_activity_lnk WHERE activity_id = $1`, [actId]);
  for (const s of ss) {
    await client.query(`DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id = $1`, [s.id]);
    await client.query(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id = $1`, [s.id]);
    await client.query(`DELETE FROM activity_signups WHERE id = $1`, [s.id]);
  }
}

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');
  const ts = Date.now();
  const RND = Math.floor(Math.random() * 1e6);
  const nm = (s) => `${PF}${s}_${ts}_${RND}`;

  // ---- 清场(开头): 验收活动(含关联报名/点记录) + 测试用户 ----
  const acts = await q(`SELECT id FROM activities WHERE title LIKE '验收-%'`);
  for (const a of acts) {
    await purgeActivitySignups(a.id);
    await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_id = $1`, [a.id]);
    await client.query(`DELETE FROM activities WHERE id = $1`, [a.id]);
  }
  await client.query(`DELETE FROM activity_series WHERE title LIKE '验收-%'`);
  await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_series_id NOT IN (SELECT id FROM activity_series) OR activity_id NOT IN (SELECT id FROM activities)`);
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

  // ---- 建活动 ----
  const formConfig = [
    { key: 'name', label: '姓名', type: 'text', required: true },
    { key: 'phone', label: '手机号', type: 'phone', required: true },
    { key: 'count', label: '同行人数', type: 'number', required: false, min: 1, max: 9 },
    { key: 'topic', label: '感兴趣主题', type: 'multi', required: false, options: ['运营', '增长', '变现'] },
    { key: 'level', label: '参与深度', type: 'select', required: true, options: ['初级', '中级'] },
  ];
  const act1Res = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: { title: '验收-表单活动', description: '带 formConfig', capacity: 100, status: 'signup_open', formConfig },
  });
  const act1 = act1Res.json?.data;
  check('建带 formConfig 活动成功', act1Res.status === 200 && !!act1?.documentId, JSON.stringify(act1));
  const act2Res = await api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken,
    body: { title: '验收-无表单活动', description: '无 formConfig', capacity: 100, status: 'signup_open' },
  });
  const act2 = act2Res.json?.data;
  check('建无 formConfig 活动成功', act2Res.status === 200 && !!act2?.documentId, JSON.stringify(act2));
  if (!act1 || !act2) { console.error('建活动失败，终止'); process.exit(1); }

  // ---- 测试用户注册(register 返回 token) ----
  const u = await register(nm('u1'));
  const userToken = u.token;
  const userId = u.id;
  check('注册测试用户 u1 且拿到 token', !!userId && !!userToken, `id=${userId}`);

  const signup = (activityId, formData) => api('POST', '/zhao-point/v1/my/activity/signup', {
    token: userToken,
    body: { activityId, formData },
  });
  const adminSignups = (docId) => api('GET', `/zhao-point/v1/admin/adm/activities/${docId}/signups`, { token: adminToken });
  const myActivities = () => api('GET', '/zhao-point/v1/my/activities', { token: userToken });

  /** 以张三身份调用且当前活动未报名过 → 正常走校验/收集；失败用例不落库 */
  const ZHANG = { name: '张三', phone: '13800138000', level: '初级' };

  // ---- 断言 1: 必填缺失(仅填 name) → 400 + errors 含 phone/level ----
  const r1 = await signup(act1.documentId, { name: '张三' });
  const e1 = r1.json?.errors || [];
  check('r1 必填缺失 400', r1.status === 400, `status=${r1.status} ${JSON.stringify(r1.json)}`);
  check('r1 errors 含 phone', e1.some((x) => x.key === 'phone'), JSON.stringify(e1));
  check('r1 errors 含 level', e1.some((x) => x.key === 'level'), JSON.stringify(e1));

  // ---- 断言 2: phone 格式错 → 400 + errors 含 phone ----
  const r2 = await signup(act1.documentId, { name: '张三', phone: '123', level: '初级' });
  const e2 = r2.json?.errors || [];
  check('r2 phone 格式错 400', r2.status === 400 && e2.some((x) => x.key === 'phone'), `status=${r2.status} ${JSON.stringify(e2)}`);

  // ---- 断言 3: number(count) 越界 → 400 + errors 含 count ----
  const r3 = await signup(act1.documentId, { ...ZHANG, count: 99 });
  const e3 = r3.json?.errors || [];
  check('r3 count 越界 400', r3.status === 400 && e3.some((x) => x.key === 'count'), `status=${r3.status} ${JSON.stringify(e3)}`);

  // ---- 断言 4: multi(topic) 非法选项 → 400 + errors 含 topic ----
  const r4 = await signup(act1.documentId, { ...ZHANG, topic: ['运营', '不存在'] });
  const e4 = r4.json?.errors || [];
  check('r4 topic 非法选项 400', r4.status === 400 && e4.some((x) => x.key === 'topic'), `status=${r4.status} ${JSON.stringify(e4)}`);

  // ---- 断言 5-7: 合法 formData 报名 ok + extra 丢弃 + 名单/我的报名返回 formData ----
  const r5 = await signup(act1.documentId, { ...ZHANG, count: '2', topic: ['运营', '增长'], extra: 'x' });
  check('r5 合法报名 ok', r5.status === 200 && r5.json?.data?.ok === true, `${r5.status} ${JSON.stringify(r5.json)}`);

  const signs = await adminSignups(act1.documentId);
  const signsArr = Array.isArray(signs.json?.data) ? signs.json.data : [];
  const mine = signsArr.find((s) => s.formData?.name === '张三');
  check('名单接口返回 formData', !!mine, `${signs.status} ${JSON.stringify(signsArr).slice(0, 200)}`);
  check('formData.count=2 数字', mine?.formData?.count === 2, `count=${JSON.stringify(mine?.formData?.count)}`);
  check('formData.topic 数组且长度2', Array.isArray(mine?.formData?.topic) && mine?.formData?.topic.length === 2 && mine?.formData?.topic[0] === '运营' && mine?.formData?.topic[1] === '增长', JSON.stringify(mine?.formData?.topic));
  check('extra 被丢弃', !('extra' in (mine?.formData || {})), JSON.stringify(mine?.formData));

  const myActs = await myActivities();
  const myArr = Array.isArray(myActs.json?.data) ? myActs.json.data : [];
  const mrow = myArr.find((s) => s.formData?.name === '张三');
  check('我的报名接口返回 formData', !!mrow, `${myActs.status} ${JSON.stringify(myArr).slice(0, 200)}`);

  // ---- 断言 8: 无 formConfig 活动兼容报名 ok ----
  const r9 = await signup(act2.documentId, { name: '李四', extra: 'y' });
  check('无表单活动兼容报名 ok', r9.status === 200 && r9.json?.data?.ok === true, `${r9.status} ${JSON.stringify(r9.json)}`);
  const signs2 = await adminSignups(act2.documentId);
  const signs2Arr = Array.isArray(signs2.json?.data) ? signs2.json.data : [];
  check('无表单活动名单无 formData(不校验不收集)', signs2Arr.length === 1 && !signs2Arr[0].formData, JSON.stringify(signs2Arr));

  // ---- 清理(零残留) ----
  for (const a of [act1, act2]) {
    const row = await q(`SELECT id FROM activities WHERE id = $1`, [a.id]);
    if (!row.length) continue;
    await purgeActivitySignups(a.id);
    await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_id = $1`, [a.id]);
    await client.query(`DELETE FROM activities WHERE id = $1`, [a.id]);
  }
  await client.query(`DELETE FROM activity_series WHERE title LIKE '验收-%'`);
  await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_series_id NOT IN (SELECT id FROM activity_series) OR activity_id NOT IN (SELECT id FROM activities)`);
  await client.query(`DELETE FROM up_users WHERE id = $1`, [userId]);

  const residue = await q(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE '验收-%') a,
      (SELECT count(*)::int FROM activity_series WHERE title LIKE '验收-%') s,
      (SELECT count(*)::int FROM activity_signups_activity_lnk WHERE activity_id NOT IN (SELECT id FROM activities)) su,
      (SELECT count(*)::int FROM activity_signups WHERE id NOT IN (SELECT activity_signup_id FROM activity_signups_activity_lnk)) sp,
      (SELECT count(*)::int FROM up_users WHERE username LIKE '${PF}%') u,
      (SELECT count(*)::int FROM zhao_point_records_user_lnk ul JOIN up_users uu ON uu.id = ul.user_id WHERE uu.username LIKE '${PF}%') pl`);
  const res = residue[0];
  check(`清理完成(活动=${res.a} 系列=${res.s} 报名孤儿=${res.su} 报名速孤儿=${res.sp} 测试用户=${res.u} 点记录=${res.pl})`,
    res.a === 0 && res.s === 0 && res.su === 0 && res.sp === 0 && res.u === 0 && res.pl === 0);

  await client.end();
  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });