/* 复购转化归因验收 (Task T6)
 * 用法: cd e:\code\basic && node scripts/accept-repurchase.cjs
 * 依赖: 本地 dev 1337 运行中(127.0.0.1:1337)。
 * 覆盖:
 *  a) 默认查询(近30天): 复购触达 job → 桥接 up_user → 窗口内 activity-signup 转化统计
 *  b) 窗口边界: 窗口外 signup 不计
 *  c) from>to -> 400
 *  d) 清理零残留(job/signup/activity/template/version/rule/user + 各 join lnk)
 * schema 要点(已对真实库核对):
 *  - sso_msg_jobs 无 user/template/version 列，关系经 join 表
 *    sso_msg_jobs_user_lnk / sso_msg_jobs_template_lnk / sso_msg_jobs_version_lnk
 *  - 送达时间列 sent_at; dedupe 列 dedupe_key
 *  - resolveUpUserForSsoUser 以 sso_users.username/email 匹配 up_users
 *  - 活动表为 activities(collectionName)，非 up_activities
 *  - activity_signups 无 dedupe 列,user/activity 关系经连接表
 *    activity_signups_user_lnk(activity_signup_id,user_id) /
 *    activity_signups_activity_lnk(activity_signup_id,activity_id)
 *  - sso_sop_rules 含 conversion_window_days 列
 */
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const pg = require('pg');
const bcrypt = require(path.join(__dirname, '..', 'node_modules', 'bcryptjs'));

const BASE = 'http://127.0.0.1:1337';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PREFIX = 'qr_';
const PWD = 'RePur123';

let PASS = 0, FAIL = 0;
function ok(name, cond, extra = '') {
  if (cond) PASS++; else FAIL++;
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : ''));
}

function req(method, p, body, token) {
  const data = body ? JSON.stringify(body) : null;
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return new Promise((resolve) => {
    const r = http.request(BASE + p, { method, headers: h, timeout: 25000 }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
      res.on('end', () => { let j = null; try { j = JSON.parse(d); } catch {} resolve({ status: res.statusCode, data: j }); });
    });
    r.on('error', (e) => resolve({ status: 0, data: 'NET_ERR: ' + e.message }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, data: 'TIMEOUT' }); });
    if (data) r.write(data); r.end();
  });
}
async function qa(sql, params) { const c = new pg.Client(PG); await c.connect(); const r = await c.query(sql, params); await c.end(); return r.rows; }
const subIds = (ids) => (ids.length ? '(' + ids.join(',') + ')' : '(NULL)');

async function cleanup() {
  // activity_signups: 无 dedupe 列, 按关联的 qr_ up_users 或 qr_ activities 定位
  await qa('DELETE FROM activity_signups_user_lnk WHERE user_id IN (SELECT id FROM up_users WHERE username LIKE $1)', [PREFIX + '%']);
  await qa('DELETE FROM activity_signups_activity_lnk WHERE activity_id IN (SELECT id FROM activities WHERE title LIKE $1)', [PREFIX + '%']);
  await qa('DELETE FROM activity_signups WHERE id IN (SELECT activity_signup_id FROM activity_signups_user_lnk WHERE user_id IN (SELECT id FROM up_users WHERE username LIKE $1))', [PREFIX + '%']);
  // up_users(回收前先清 sso 与 job 依赖,再删 up_users)
  const up = await qa('SELECT id FROM up_users WHERE username LIKE $1', [PREFIX + '%']);
  if (up.length) await qa('DELETE FROM up_users WHERE id IN ' + subIds(up.map((r) => r.id)));
  // activities
  await qa('DELETE FROM activities WHERE title LIKE ' + "'" + PREFIX + "%'");
  // jobs + lnks（scene 固定为 activity.repurchase，按 qr_ 前缀 dedupe_key 定位）
  const jobs = await qa('SELECT id FROM sso_msg_jobs WHERE dedupe_key LIKE $1', [PREFIX + '%']);
  if (jobs.length) {
    const S = subIds(jobs.map((r) => r.id));
    await qa('DELETE FROM sso_msg_jobs_user_lnk WHERE msg_job_id IN ' + S);
    await qa('DELETE FROM sso_msg_jobs_template_lnk WHERE msg_job_id IN ' + S);
    await qa('DELETE FROM sso_msg_jobs_version_lnk WHERE msg_job_id IN ' + S);
    await qa('DELETE FROM sso_msg_jobs WHERE id IN ' + S);
  }
  // versions + 其 template join lnk
  const ver = await qa('SELECT id FROM sso_msg_template_versions WHERE code LIKE $1', [PREFIX + '%']);
  if (ver.length) {
    const S = subIds(ver.map((r) => r.id));
    await qa('DELETE FROM sso_msg_template_versions_template_lnk WHERE msg_template_version_id IN ' + S);
    await qa('DELETE FROM sso_msg_template_versions WHERE id IN ' + S);
  }
  await qa('DELETE FROM sso_msg_template_versions_template_lnk WHERE msg_template_id IN (SELECT id FROM sso_msg_templates WHERE code LIKE $1)', [PREFIX + '%']);
  await qa('DELETE FROM sso_msg_templates WHERE code LIKE ' + "'" + PREFIX + "%'");
  await qa('DELETE FROM sso_sop_rules WHERE code LIKE ' + "'" + PREFIX + "%'");
  const us = await qa('SELECT id FROM sso_users WHERE username LIKE $1', [PREFIX + '%']);
  if (us.length) { const S = subIds(us.map((r) => r.id)); await qa('DELETE FROM sso_users WHERE id IN ' + S); }
}

(async () => {
  await cleanup();

  // ---------- 0. admin 登录 ----------
  let r = await req('POST', '/api/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  const token = r.data && (r.data.jwt || r.data.token || (r.data.data && r.data.data.token));
  ok('admin 登录', !!token, `status=${r.status}`);
  if (!token) { console.error('admin 登录失败，终止'); process.exit(1); }

  const ts = Date.now();
  const hash = bcrypt.hashSync(PWD, 10);

  // ---------- 1. 种子数据 ----------
  // 1.1 模板 + active 版本(经 template join lnk)
  const tpl = await qa(
    'INSERT INTO sso_msg_templates (document_id,code,name,provider,is_enabled,created_at,updated_at) VALUES ($1,$2,$3,$4,true,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'qr_tpl_' + ts, 'QR模板', 'wechat']
  );
  const tplId = tpl[0].id;
  const ver = await qa(
    "INSERT INTO sso_msg_template_versions (document_id,code,name,status,created_at,updated_at) VALUES ($1,$2,$3,'active',now(),now()) RETURNING id",
    [crypto.randomUUID(), 'qr_ver_' + ts, 'QR版本']
  );
  const verId = ver[0].id;
  await qa('INSERT INTO sso_msg_template_versions_template_lnk (msg_template_version_id, msg_template_id) VALUES ($1,$2)', [verId, tplId]);
  ok('建模板+版本(active, 经 template join lnk)', !!verId, `tplId=${tplId} verId=${verId}`);

  // 1.2 sop-rule: scene=activity.repurchase, conversion_window_days=7
  const rule = await qa(
    'INSERT INTO sso_sop_rules (document_id,code,name,source,scene,template_code,conversion_window_days,enabled,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,true,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'qr_rule_' + ts, 'QR复购规则', 'cron', 'activity.repurchase', 'qr_tpl_' + ts, 7]
  );
  ok('建 repurchase sop-rule(conversion_window_days=7)', !!rule[0].id, `ruleId=${rule[0].id}`);

  // 1.3 用户 A: up_users + sso_users, username 相同 → resolveUpUserForSsoUser 按 username 桥接
  const upA = await qa(
    'INSERT INTO up_users (document_id,username,email,password,provider,confirmed,blocked,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,true,false,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'qr_A_' + ts, 'qr_a_' + ts + '@qr.vip', hash, 'local']
  );
  const upAId = upA[0].id;
  const ssoA = await qa(
    'INSERT INTO sso_users (document_id,uuid,username,email,password_hash,status,register_channel,login_count,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,0,now(),now()) RETURNING id',
    [crypto.randomUUID(), crypto.randomUUID(), 'qr_A_' + ts, 'qr_a_' + ts + '@qr.vip', hash, 'active', 'accept']
  );
  const ssoAId = ssoA[0].id;
  ok('建用户A(sso+up 按 username 桥接)', !!upAId && !!ssoAId, `ssoA=${ssoAId} upA=${upAId}`);

  // 1.4 活动(activities 表)
  const act = await qa(
    'INSERT INTO activities (document_id,title,type,capacity,status,created_at,updated_at) VALUES ($1,$2,$3,100,$4,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'qr_act_' + ts, '体验课', 'signup_open']
  );
  const actId = act[0].id;
  ok('建活动', !!actId, `actId=${actId}`);

  // 1.5 复购触达 job A: scene=activity.repurchase, sent_at=1天前, user/template/version 经 join 表
  const jobA = await qa(
    "INSERT INTO sso_msg_jobs (document_id,scene,provider,status,retry_count,dedupe_key,created_at,updated_at) VALUES ($1,'activity.repurchase', $2,'sent',0,$3,now(),now()) RETURNING id",
    [crypto.randomUUID(), 'wechat', 'qr_ded_A_' + ts]
  );
  const jobAId = jobA[0].id;
  await qa('UPDATE sso_msg_jobs SET sent_at = now() - interval \'1 day\' WHERE id=$1', [jobAId]);
  await qa('INSERT INTO sso_msg_jobs_user_lnk (msg_job_id,sso_user_id) VALUES ($1,$2)', [jobAId, ssoAId]);
  await qa('INSERT INTO sso_msg_jobs_template_lnk (msg_job_id,msg_template_id) VALUES ($1,$2)', [jobAId, tplId]);
  await qa('INSERT INTO sso_msg_jobs_version_lnk (msg_job_id,msg_template_version_id) VALUES ($1,$2)', [jobAId, verId]);
  ok('造复购触达 job A(sent, 1天前送达)', !!jobAId, `jobA=${jobAId}`);

  // 1.6 signup A: user→upA, 活动, status=active, signup_at=now()(窗口内)
  const sigA = await qa(
    'INSERT INTO activity_signups (document_id,status,created_at,updated_at) VALUES ($1,$2,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'active']
  );
  const sigAId = sigA[0].id;
  await qa('UPDATE activity_signups SET signup_at = now() WHERE id=$1', [sigAId]);
  await qa('INSERT INTO activity_signups_user_lnk (activity_signup_id,user_id) VALUES ($1,$2)', [sigAId, upAId]);
  await qa('INSERT INTO activity_signups_activity_lnk (activity_signup_id,activity_id) VALUES ($1,$2)', [sigAId, actId]);
  ok('造 signup A(active, now() 窗口内)', !!sigAId, `sigA=${sigAId}`);

  // ---------- 2. 默认查询(近30天)断言 ----------
  let g = await req('GET', '/api/zhao-sso/v1/admin/msg/repurchase-stats', null, token);
  let d = g.data && g.data.data;
  ok('默认查询 200 且有 data', g.status === 200 && !!d, `status=${g.status}`);
  if (!d || g.status !== 200) { console.error('repurchase-stats 异常:', JSON.stringify(g.data)); }
  ok('windowDays=7', d && d.windowDays === 7, `windowDays=${d && d.windowDays}`);
  ok('summary.sent=1', d && d.summary.sent === 1, `sent=${d && d.summary.sent}`);
  ok('summary.convertedUsers=1', d && d.summary.convertedUsers === 1, `convUsers=${d && d.summary.convertedUsers}`);
  ok('summary.conversions=1', d && d.summary.conversions === 1, `conv=${d && d.summary.conversions}`);
  ok('summary.conversionRate=100', d && d.summary.conversionRate === 100, `rate=${d && d.summary.conversionRate}`);

  // ---------- 3. 窗口边界: 用户B 8天前送达的 job, signup_at=now()(=sent_at+8天, 窗口外) ----------
  const upB = await qa(
    'INSERT INTO up_users (document_id,username,email,password,provider,confirmed,blocked,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,true,false,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'qr_B_' + ts, 'qr_b_' + ts + '@qr.vip', hash, 'local']
  );
  const upBId = upB[0].id;
  const ssoB = await qa(
    'INSERT INTO sso_users (document_id,uuid,username,email,password_hash,status,register_channel,login_count,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,0,now(),now()) RETURNING id',
    [crypto.randomUUID(), crypto.randomUUID(), 'qr_B_' + ts, 'qr_b_' + ts + '@qr.vip', hash, 'active', 'accept']
  );
  const ssoBId = ssoB[0].id;
  const jobB = await qa(
    "INSERT INTO sso_msg_jobs (document_id,scene,provider,status,retry_count,dedupe_key,created_at,updated_at) VALUES ($1,'activity.repurchase', $2,'sent',0,$3,now(),now()) RETURNING id",
    [crypto.randomUUID(), 'wechat', 'qr_ded_B_' + ts]
  );
  const jobBId = jobB[0].id;
  await qa('UPDATE sso_msg_jobs SET sent_at = now() - interval \'8 day\' WHERE id=$1', [jobBId]);
  await qa('INSERT INTO sso_msg_jobs_user_lnk (msg_job_id,sso_user_id) VALUES ($1,$2)', [jobBId, ssoBId]);
  await qa('INSERT INTO sso_msg_jobs_template_lnk (msg_job_id,msg_template_id) VALUES ($1,$2)', [jobBId, tplId]);
  await qa('INSERT INTO sso_msg_jobs_version_lnk (msg_job_id,msg_template_version_id) VALUES ($1,$2)', [jobBId, verId]);
  const sigB = await qa(
    'INSERT INTO activity_signups (document_id,status,created_at,updated_at) VALUES ($1,$2,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'active']
  );
  const sigBId = sigB[0].id;
  await qa('UPDATE activity_signups SET signup_at = now() WHERE id=$1', [sigBId]); // = sent_at+8天
  await qa('INSERT INTO activity_signups_user_lnk (activity_signup_id,user_id) VALUES ($1,$2)', [sigBId, upBId]);
  await qa('INSERT INTO activity_signups_activity_lnk (activity_signup_id,activity_id) VALUES ($1,$2)', [sigBId, actId]);
  ok('造用户B+job B(8天前送达)+signup B(窗口外)', !!jobBId && !!sigBId, `jobB=${jobBId} sigB=${sigBId}`);

  g = await req('GET', '/api/zhao-sso/v1/admin/msg/repurchase-stats', null, token);
  d = g.data && g.data.data;
  ok('边界后 sent=2', d && d.summary.sent === 2, `sent=${d && d.summary.sent}`);
  ok('边界后 convertedUsers=1(仅A)', d && d.summary.convertedUsers === 1, `convUsers=${d && d.summary.convertedUsers}`);
  ok('边界后 conversions=1', d && d.summary.conversions === 1, `conv=${d && d.summary.conversions}`);
  ok('边界后 conversionRate=50', d && d.summary.conversionRate === 50, `rate=${d && d.summary.conversionRate}`);

  // ---------- 4. from>to -> 400 ----------
  g = await req('GET', '/api/zhao-sso/v1/admin/msg/repurchase-stats?from=' + encodeURIComponent('2026-09-01') + '&to=' + encodeURIComponent('2026-01-01'), null, token);
  ok('from>to 返回 400', g.status === 400, `status=${g.status}`);

  // ---------- 5. 清理零残留 ----------
  await cleanup();
  const rc = (await qa(`SELECT
      (SELECT count(*)::int FROM sso_msg_jobs WHERE dedupe_key LIKE $1) j,
      (SELECT count(*)::int FROM sso_sop_rules WHERE code LIKE $2) r,
      (SELECT count(*)::int FROM sso_msg_templates WHERE code LIKE $3) t,
      (SELECT count(*)::int FROM sso_msg_template_versions WHERE code LIKE $4) v,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE $5) u,
      (SELECT count(*)::int FROM up_users WHERE username LIKE $6) uu,
      (SELECT count(*)::int FROM activities WHERE title LIKE $7) a,
      (SELECT count(*)::int FROM activity_signups WHERE id IN (SELECT activity_signup_id FROM activity_signups_user_lnk WHERE user_id IN (SELECT id FROM up_users WHERE username LIKE $8))) sg,
      (SELECT count(*)::int FROM sso_msg_jobs_user_lnk WHERE msg_job_id IN (SELECT id FROM sso_msg_jobs WHERE dedupe_key LIKE $9)) ju`,
    [PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%']))[0];
  ok('清理零残留(job/rule/template/version/sso_user/up_user/activity/signup/join 均 0)',
    rc.j === 0 && rc.r === 0 && rc.t === 0 && rc.v === 0 && rc.u === 0 && rc.uu === 0 && rc.a === 0 && rc.sg === 0 && rc.ju === 0,
    `j=${rc.j} r=${rc.r} t=${rc.t} v=${rc.v} u=${rc.u} uu=${rc.uu} a=${rc.a} sg=${rc.sg} ju=${rc.ju}`);

  console.log(`\n=== 复购转化归因验收: PASS=${PASS} FAIL=${FAIL} ===`);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error('脚本异常:', e && e.stack || e); process.exit(1); });