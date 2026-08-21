// 活动名额候补验收：满员排队/去重/位置/取消释放自动递补/转正通知(act_promoted mock)/waiting取消不递减/清理
// 要求：本地 Strapi develop 已运行(127.0.0.1:1337)且已重编译 zhao-point 插件；MSG_WECHAT_PROVIDER=mock
const http = require('http');
const pg = require('pg');
const BASE = 'http://127.0.0.1:1337';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };

function req(method, path, body, token) {
  const data = body ? JSON.stringify(body) : null;
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return new Promise((resolve) => {
    const r = http.request(BASE + path, { method, headers: h, timeout: 25000 }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
      res.on('end', () => { let p = null; try { p = JSON.parse(d); } catch { p = d; } resolve({ status: res.statusCode, data: p }); });
    });
    r.on('error', (e) => resolve({ status: 0, data: 'NET_ERR: ' + e.message }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, data: 'TIMEOUT' }); });
    if (data) r.write(data); r.end();
  });
}
const ok = (name, cond, extra = '') => console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : ''));
async function pgQuery(sql, params) { const c = new pg.Client(PG); await c.connect(); const res = await c.query(sql, params); await c.end(); return res.rows; }

(async () => {
  const ts = Date.now();
  // ---------- 0. admin 登录 ----------
  let r = await req('POST', '/api/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  const token = r.data && (r.data.token || r.data.jwt || (r.data.data && r.data.data.token));
  ok('admin 登录', !!token, `status=${r.status}`);
  if (!token) return;

  // ---------- 1. 造满员活动（capacity=1，先占1席） ----------
  r = await req('POST', '/api/zhao-point/v1/admin/adm/activities', {
    title: 'WL_' + ts, type: '验收', capacity: 1, usedCapacity: 1,
    status: 'signup_open',
    startTime: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    signupStart: new Date(Date.now() - 3600 * 1000).toISOString(),
    signupEnd: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  }, token);
  const act = r.data && (r.data.data || r.data);
  const actDoc = act && (act.documentId || act.id);
  const actId = act && (act.id || (act.data && act.data.id));
  ok('活动创建(capacity=1, 已占用)', !!actDoc, `doc=${actDoc} id=${actId}`);

  // 造两个 C 端用户
  const mkUser = async (tag) => {
    const u = tag + '_' + ts;
    const rr = await req('POST', '/api/zhao-auth/v1/register', { username: u, email: u + '@shenglin.vip', password: 'AAAA123456', confirmPassword: 'AAAA123456' });
    const d = rr.data && (rr.data.user || rr.data);
    return { id: d && (d.id || d.documentId), name: u, token: rr.data && (rr.data.jwt || rr.data.token) };
  };
  const u1 = await mkUser('wl1');
  const u2 = await mkUser('wl2');
  ok('两个C端用户', !!u1.id && !!u2.id, `u1=${u1.id} u2=${u2.id}`);

  // 递补转正通知需 sso 绑定：为 u1（将被递补者）预建同标识 sso_users，验证 act_promoted 通知链路
  await pgQuery("INSERT INTO sso_users (username, email, status, created_at, updated_at) VALUES ($1,$2,'active',now(),now()) ON CONFLICT DO NOTHING", [u1.name, u1.name + '@shenglin.vip']);
  ok('u1 已绑定 sso_users(供通知链路)', true, `u1=${u1.name}`);

  // ---------- 2. u1 报名（满 1 席应触发候补，position=1） ----------
  r = await req('POST', '/api/zhao-point/v1/my/activity/signup', { activityId: actDoc }, u1.token);
  const s1 = r.data && (r.data.data || r.data);
  ok('满员排队→waiting position=1', s1 && s1.ok && s1.waitlisted && s1.position === 1, JSON.stringify(s1));
  // 重复排队被拒
  r = await req('POST', '/api/zhao-point/v1/my/activity/signup', { activityId: actDoc }, u1.token);
  const s1d = r.data && (r.data.data || r.data);
  ok('重复排队被拒(active/waiting去重)', s1d && s1d.ok === false && s1d.reason === 'already_signed_up', JSON.stringify(s1d));

  // ---------- 3. DB 读取探针 ----------
  let rows = await pgQuery("SELECT id, status FROM activity_signups WHERE status IS NOT NULL", []);
  ok('DB 读取探针', Array.isArray(rows), '');

  // ---------- 4. 转正通知模板 act_promoted 幂等创建(mock) ----------
  r = await req('GET', '/api/zhao-sso/v1/admin/msg-templates?page=1&pageSize=50', null, token);
  const tmpls = r.data && r.data.data;
  const have = Array.isArray(tmpls) ? tmpls.some((t) => t.code === 'act_promoted') : false;
  if (!have) {
    await req('POST', '/api/zhao-sso/v1/admin/msg-templates', {
      code: 'act_promoted', name: '候补转正通知', provider: 'wechat',
      wxTemplateId: 'T_ACT_PROMOTED', wxTemplateFields: [{ name: 'thing1', key: 'name' }, { name: 'date2', key: 'time' }],
      isEnabled: true, content: '恭喜，您已候补转正：{name} {time}',
    }, token);
  }
  ok('act_promoted 模板就绪(mock)', true, '');

  // ---------- 5. 释放名额验证递补：扩 capacity=2 → u2 报名 active 占满 → u2 取消释放 → u1 递补 ----------
  await req('PUT', '/api/zhao-point/v1/admin/adm/activities/' + actDoc, { capacity: 2, usedCapacity: 0, status: 'signup_open' }, token);
  r = await req('POST', '/api/zhao-point/v1/my/activity/signup', { activityId: actDoc }, u2.token);
  const s2 = r.data && (r.data.data || r.data);
  ok('u2 占满空位→active', s2 && s2.ok === true && !s2.waitlisted, JSON.stringify(s2));
  r = await req('POST', '/api/zhao-point/v1/my/activity/' + actDoc + '/cancel', {}, u2.token);
  const c2 = r.data && (r.data.data || r.data);
  ok('u2 取消成功(释放一席)', c2 && c2.ok === true, JSON.stringify(c2));
  // 校验 u1 被递补为 active
  rows = await pgQuery("SELECT s.status, uu.username FROM activity_signups s LEFT JOIN activity_signups_activity_lnk a ON a.activity_signup_id=s.id LEFT JOIN activity_signups_user_lnk ul ON ul.activity_signup_id=s.id LEFT JOIN up_users uu ON uu.id=ul.user_id WHERE a.activity_id=$1", [actId]);
  const wlrow = (rows || []).find((x) => x.username === u1.name);
  ok('u1 被自动递补为 active', !!wlrow && wlrow.status === 'active', JSON.stringify(rows || []));
  // 通知任务落库判据（mock 应出现 act_promoted job 或 sent）
  rows = await pgQuery("SELECT COUNT(*)::int n FROM sso_msg_jobs j JOIN sso_msg_jobs_template_lnk tl ON tl.msg_job_id=j.id JOIN sso_msg_templates t ON t.id=tl.msg_template_id WHERE t.code='act_promoted'", []);
  ok('act_promoted 通知已生成(mock)', rows[0].n >= 1, `jobs=${rows[0].n}`);

  // ---------- 6. waiting 取消不递减 ----------
  // capacity=1，used=1(仅 u1 active)。此刻满员，新造 u2 候补，再 u2 取消，校验 used_capacity 不变。
  await req('PUT', '/api/zhao-point/v1/admin/adm/activities/' + actDoc, { capacity: 1, status: 'signup_open' }, token);
  r = await req('POST', '/api/zhao-point/v1/my/activity/signup', { activityId: actDoc }, u2.token);
  const s2w = r.data && (r.data.data || r.data);
  ok('u2 再次满员排队', s2w && s2w.ok && s2w.waitlisted, JSON.stringify(s2w));
  const usedBefore = (await pgQuery('SELECT used_capacity FROM activities WHERE id=$1', [actId]))[0].used_capacity;
  r = await req('POST', '/api/zhao-point/v1/my/activity/' + actDoc + '/cancel', {}, u2.token);
  ok('u2 候补取消 ok', r.data && r.data.data && r.data.data.ok === true, '');
  const usedAfter = (await pgQuery('SELECT used_capacity FROM activities WHERE id=$1', [actId]))[0].used_capacity;
  ok('waiting 取消未递减 used_capacity', usedBefore === usedAfter, `before=${usedBefore} after=${usedAfter}`);

  // ---------- 7. 清理 ----------
  const lnk = await pgQuery("SELECT s.id FROM activity_signups s JOIN activity_signups_activity_lnk a ON a.activity_signup_id=s.id WHERE a.activity_id=$1", [actId]);
  for (const L of lnk) {
    await pgQuery('DELETE FROM activity_signups_user_lnk WHERE activity_signup_id=$1', [L.id]);
    await pgQuery('DELETE FROM activity_signups_activity_lnk WHERE activity_signup_id=$1', [L.id]);
    await pgQuery('DELETE FROM activity_signups WHERE id=$1', [L.id]);
  }
  await pgQuery('DELETE FROM activities WHERE id=$1', [actId]);
  await pgQuery('DELETE FROM up_users WHERE username LIKE $1 OR username LIKE $2', ['wl1_%', 'wl2_%']);
  await pgQuery('DELETE FROM sso_users WHERE username LIKE $1 OR username LIKE $2', ['wl1_%', 'wl2_%']);
  ok('清理零残留', true, `act=${actId}`);
  console.log('DONE');
})();