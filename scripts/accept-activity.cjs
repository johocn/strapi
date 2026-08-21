/* 活动报名+到场签到 验收（一次性 API 走查）
 * 用法: cd e:\code\basic && node scripts/accept-activity.cjs
 * 后端 content-api 前缀为 /api（Strapi 默认）
 */
const { Client } = require('pg');
const crypto = require('crypto');

const BASE = 'http://127.0.0.1:1337/api';
const PG = {
  host: '127.0.0.1', port: 5432, database: 'strapi',
  user: 'postgres', password: 'admin',
};

const out = [];
const check = (name, cond, detail = '') => {
  out.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};
let client;

async function insertActivity({ title, capacity = 100, used = 0, status = 'signup_open', geo = false, radius = 500, lat = 39.9, lng = 116.4 }) {
  const docId = crypto.randomUUID();
  await client.query(
    `INSERT INTO activities (document_id,title,description,start_time,end_time,venue_name,lat,lng,capacity,used_capacity,signup_start,signup_end,checkin_mode,geo_enforced,geo_radius_m,status,channel_scope,created_at,updated_at)
     VALUES ($1,$2,$3,now()+'1 day',now()+'2 day',$4,$5,$6,$7,$8,now()-$9::interval,now()+$9::interval,'both',$10,$11,$12,'all',now(),now())`,
    [docId, title, '验收用活动', '测试场地', lat, lng, capacity, used, '1 hour', geo, radius, status]
  );
  return docId;
}

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

async function login(identifier, password) {
  // 本地 SSO 已临时关闭：zhao/shao 是 up_users 本地用户，走 zhao-auth 登录
  const res = await api('POST', '/zhao-auth/v1/login', { body: { identifier, password } });
  return res.json;
}

async function register(username) {
  // zhao-auth 注册（audit 用户走本地注册）
  const res = await api('POST', '/zhao-auth/v1/register', {
    body: { username, email: `${username}@audit.local`, password: 'a123456' },
  });
  return res.json;
}

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');

  // 清理历史验收活动（避免脏数据）
  await client.query(`DELETE FROM activities WHERE title LIKE '验收-%'`);

  // 1) 核心活动：geoEnforced=false, capacity=2
  const coreId = await insertActivity({ title: '验收-核心活动', capacity: 2, used: 0 });
  // 2) geo 强控活动：radius=500m
  const geoId = await insertActivity({ title: '验收-geo活动', geo: true, radius: 500 });
  // 3) 满员活动：capacity=1
  const fullId = await insertActivity({ title: '验收-满员活动', capacity: 1, used: 0 });

  // 登录 zhao
  const zhaoLogin = await login('zhao', 'a123456');
  const zhaoToken = zhaoLogin?.access_token || zhaoLogin?.jwt || zhaoLogin?.token;
  check('zhao 登录拿到 jwt', !!zhaoToken, JSON.stringify(zhaoLogin).slice(0, 120));

  // ===== 核心闭环：报名 → 幂等 → 签到 → 幂等 → 积分 =====
  let r = await api('POST', '/zhao-point/v1/my/activity/signup', { token: zhaoToken, body: { activityId: coreId } });
  check('核心：报名成功', r.status === 200 && r.json?.data?.ok === true, `${r.status} ${JSON.stringify(r.json)}`);

  r = await api('POST', '/zhao-point/v1/my/activity/signup', { token: zhaoToken, body: { activityId: coreId } });
  check('核心：重复报名被拒(already_signed_up)', r.json?.data?.ok === false && r.json?.data?.reason === 'already_signed_up', `${r.status} ${JSON.stringify(r.json)}`);

  r = await api('POST', `/zhao-point/v1/my/activity/${coreId}/checkin`, { token: zhaoToken, body: { method: 'self' } });
  check('核心：自助签到成功', r.json?.data?.ok === true && r.json?.data?.point === true, `${r.status} ${JSON.stringify(r.json)}`);

  r = await api('POST', `/zhao-point/v1/my/activity/${coreId}/checkin`, { token: zhaoToken, body: { method: 'self' } });
  check('核心：重复签到幂等拒绝', r.json?.data?.ok === false && r.json?.data?.reason === 'already_checked_in', `${r.status} ${JSON.stringify(r.json)}`);

  // 我的活动列表
  r = await api('GET', '/zhao-point/v1/my/activities', { token: zhaoToken });
  const mine = r.json?.data || [];
  check('我的活动列表包含核心活动且已到场', Array.isArray(mine) && mine.some(s => s.activity?.documentId === coreId && s.attendance), `${r.status} count=${mine.length}`);

  // 积分到账（balance + 按 action 过滤记录）
  r = await api('GET', '/zhao-point/v1/my/point/balance', { token: zhaoToken });
  const bal = r.json?.data;
  check('积分余额接口可用', r.status === 200 && bal != null, `${r.status} ${JSON.stringify(r.json)}`);

  r = await api('GET', '/zhao-point/v1/my/point/records?action=activity_signup', { token: zhaoToken });
  const signupRecs = (r.json?.data?.records || r.json?.data || []).length;
  check('报名积分 activity_signup 到账(>=1条)', signupRecs >= 1, `${r.status} count=${signupRecs}`);

  r = await api('GET', '/zhao-point/v1/my/point/records?action=activity_attend', { token: zhaoToken });
  const attendRecs = (r.json?.data?.records || r.json?.data || []).length;
  check('到场积分 activity_attend 到账(>=1条)', attendRecs >= 1, `${r.status} count=${attendRecs}`);

  // ===== geo 强控 =====
  r = await api('POST', '/zhao-point/v1/my/activity/signup', { token: zhaoToken, body: { activityId: geoId } });
  check('geo活动：报名成功', r.json?.data?.ok === true, `${r.status} ${JSON.stringify(r.json)}`);
  // 超距（30km）应失败
  r = await api('POST', `/zhao-point/v1/my/activity/${geoId}/checkin`, { token: zhaoToken, body: { method: 'self', lat: 39.9 + 0.3, lng: 116.4 + 0.3 } });
  check('geo活动：超距签到被拒', r.status === 400 && /不在活动场地范围内/.test(JSON.stringify(r.json)), `${r.status} ${JSON.stringify(r.json)}`);
  // 场地内成功
  r = await api('POST', `/zhao-point/v1/my/activity/${geoId}/checkin`, { token: zhaoToken, body: { method: 'self', lat: 39.9, lng: 116.4 } });
  check('geo活动：半径内签到成功', r.json?.data?.ok === true, `${r.status} ${JSON.stringify(r.json)}`);

  // ===== 满员 =====
  const a = await register('audit_alice');
  const aToken = a?.access_token || a?.jwt || a?.token;
  check('注册 audit_alice 成功', !!aToken, JSON.stringify(a).slice(0, 100));
  if (aToken) {
    r = await api('POST', '/zhao-point/v1/my/activity/signup', { token: aToken, body: { activityId: fullId } });
    check('满员活动：第1人报名成功(capacity=1)', r.json?.data?.ok === true, `${r.status} ${JSON.stringify(r.json)}`);
    const b = await register('audit_bob');
    const bToken = b?.access_token || b?.jwt || b?.token;
    if (bToken) {
      r = await api('POST', '/zhao-point/v1/my/activity/signup', { token: bToken, body: { activityId: fullId } });
      check('满员活动：第2人报满被拒(名额已满)', r.status === 400 && /名额已满/.test(JSON.stringify(r.json)), `${r.status} ${JSON.stringify(r.json)}`);
    } else {
      check('注册 audit_bob 成功', false, JSON.stringify(b).slice(0, 100));
    }
  }

  // ===== admin 列表（无 admin token，预期 401/403，仅探测）=====
  r = await api('GET', '/zhao-point/v1/adm/activities', { token: zhaoToken });
  check('admin活动列表 zhao(无权限) 被拒', r.status === 401 || r.status === 403 || r.status === 404, `${r.status}`);

  // 清理：注销本次启动测试用户（保留 zhao）
  await client.query(`DELETE FROM up_users WHERE username IN ('audit_alice','audit_bob')`);

  console.log('\n===== 验收结果 =====');
  out.forEach(l => console.log(l));
  await client.end();
}

main().catch(e => { console.error('脚本异常:', e); process.exit(1); });