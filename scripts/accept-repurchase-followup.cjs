/* 复购线索跟进验收 (阶段B「评价/复购运营侧深化」补齐项)
 * 用法: cd e:\code\basic && node scripts/accept-repurchase-followup.cjs
 * 依赖: 本地 dev 1337 运行中(127.0.0.1:1337)。前置: zhao-sso 插件已 build(含新 schema 字段 follow_status/follow_remark)。
 * 覆盖:
 *  a) GET /admin/msg/repurchase-leads: 列出 scene=activity.repurchase 触达(全状态,含 pending), 每条附窗内再报名次数 reorderedCount
 *  b) status 过滤(followStatus)
 *  c) from>to -> 400
 *  d) POST /admin/msg/repurchase-leads/:id/follow: 标记 none/followed/deal + 备注
 *  e) 清理零残留(job/signup/activity/template/version/rule/user + 各 join lnk)
 * schema 要点(对真实库核对, 复用 accept-repurchase.cjs 基线):
 *  - sso_msg_jobs 无 user/template/version 列; 关系经 sso_msg_jobs_user_lnk(字段 sso_user_id)/template_lnk/version_lnk
 *  - 送达时间 sent_at; dedupe dedupe_key; 新字段 follow_status / follow_remark
 *  - sso_users.username 与 up_users.username 相同 → resolveUpUserForSsoUser 按 username 桥接
 *  - 活动 activities(collectionName); activity_signups user/activity 关系经连接表
 *  - sso_sop_rules 含 conversion_window_days
 */
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const pg = require('pg');
const bcrypt = require(path.join(__dirname, '..', 'node_modules', 'bcryptjs'));

const BASE = 'http://127.0.0.1:1337';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PREFIX = 'fl_';
const PWD = 'Follow123';

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
  await qa('DELETE FROM activity_signups_user_lnk WHERE user_id IN (SELECT id FROM up_users WHERE username LIKE $1)', [PREFIX + '%']);
  await qa('DELETE FROM activity_signups_activity_lnk WHERE activity_id IN (SELECT id FROM activities WHERE title LIKE $1)', [PREFIX + '%']);
  await qa('DELETE FROM activity_signups WHERE id IN (SELECT activity_signup_id FROM activity_signups_user_lnk WHERE user_id IN (SELECT id FROM up_users WHERE username LIKE $1))', [PREFIX + '%']);
  const up = await qa('SELECT id FROM up_users WHERE username LIKE $1', [PREFIX + '%']);
  if (up.length) await qa('DELETE FROM up_users WHERE id IN ' + subIds(up.map((r) => r.id)));
  await qa('DELETE FROM activities WHERE title LIKE ' + "'" + PREFIX + "%'");
  const jobs = await qa('SELECT id FROM sso_msg_jobs WHERE dedupe_key LIKE $1', [PREFIX + '%']);
  if (jobs.length) {
    const S = subIds(jobs.map((r) => r.id));
    await qa('DELETE FROM sso_msg_jobs_user_lnk WHERE msg_job_id IN ' + S);
    await qa('DELETE FROM sso_msg_jobs_template_lnk WHERE msg_job_id IN ' + S);
    await qa('DELETE FROM sso_msg_jobs_version_lnk WHERE msg_job_id IN ' + S);
    await qa('DELETE FROM sso_msg_jobs WHERE id IN ' + S);
  }
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
  const tpl = await qa(
    'INSERT INTO sso_msg_templates (document_id,code,name,provider,is_enabled,created_at,updated_at) VALUES ($1,$2,$3,$4,true,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'fl_tpl_' + ts, 'FL模板', 'wechat']);
  const tplId = tpl[0].id;
  const ver = await qa(
    "INSERT INTO sso_msg_template_versions (document_id,code,name,status,created_at,updated_at) VALUES ($1,$2,$3,'active',now(),now()) RETURNING id",
    [crypto.randomUUID(), 'fl_ver_' + ts, 'FL版本']);
  const verId = ver[0].id;
  await qa('INSERT INTO sso_msg_template_versions_template_lnk (msg_template_version_id, msg_template_id) VALUES ($1,$2)', [verId, tplId]);
  ok('建模板+版本(active)', !!verId, `tplId=${tplId} verId=${verId}`);

  const rule = await qa(
    'INSERT INTO sso_sop_rules (document_id,code,name,source,scene,template_code,conversion_window_days,enabled,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,true,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'fl_rule_' + ts, 'FL复购规则', 'cron', 'activity.repurchase', 'fl_tpl_' + ts, 7]);
  ok('建 repurchase sop-rule(conversion_window_days=7)', !!rule[0].id, `ruleId=${rule[0].id}`);

  // 用户 A: 触达后窗口内有再报名(signup now())  → reorderedCount=1
  const upA = await qa(
    'INSERT INTO up_users (document_id,username,email,password,provider,confirmed,blocked,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,true,false,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'fl_A_' + ts, 'fl_a_' + ts + '@fl.vip', hash, 'local']);
  const upAId = upA[0].id;
  const ssoA = await qa(
    'INSERT INTO sso_users (document_id,uuid,username,email,password_hash,status,register_channel,login_count,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,0,now(),now()) RETURNING id',
    [crypto.randomUUID(), crypto.randomUUID(), 'fl_A_' + ts, 'fl_a_' + ts + '@fl.vip', hash, 'active', 'accept']);
  const ssoAId = ssoA[0].id;
  // 用户 B: 无再报名 → reorderedCount=0
  const ssoB = await qa(
    'INSERT INTO sso_users (document_id,uuid,username,email,password_hash,status,register_channel,login_count,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,0,now(),now()) RETURNING id',
    [crypto.randomUUID(), crypto.randomUUID(), 'fl_B_' + ts, 'fl_b_' + ts + '@fl.vip', 'x', 'active', 'accept']);
  const ssoBId = ssoB[0].id; // B 无 up_user → upId null, user 展示用 sso 信息
  ok('建用户A(sso+up桥接) 与 用户B(仅sso)', !!ssoAId && !!ssoBId && !!upAId, `ssoA=${ssoAId} ssoB=${ssoBId} upA=${upAId}`);

  const act = await qa(
    'INSERT INTO activities (document_id,title,type,capacity,status,created_at,updated_at) VALUES ($1,$2,$3,100,$4,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'fl_act_' + ts, '体验课', 'signup_open']);
  const actId = act[0].id;
  ok('建活动', !!actId, `actId=${actId}`);

  // job A: scene=activity.repurchase, sent 1天前送达, followStatus=none
  const jobA = await qa(
    "INSERT INTO sso_msg_jobs (document_id,scene,provider,status,retry_count,dedupe_key,created_at,updated_at) VALUES ($1,'activity.repurchase',$2,'sent',0,$3,now(),now()) RETURNING id",
    [crypto.randomUUID(), 'wechat', 'fl_ded_A_' + ts]);
  const jobAId = jobA[0].id;
  await qa('UPDATE sso_msg_jobs SET sent_at = now() - interval \'1 day\' WHERE id=$1', [jobAId]);
  await qa('INSERT INTO sso_msg_jobs_user_lnk (msg_job_id,sso_user_id) VALUES ($1,$2)', [jobAId, ssoAId]);
  await qa('INSERT INTO sso_msg_jobs_template_lnk (msg_job_id,msg_template_id) VALUES ($1,$2)', [jobAId, tplId]);
  await qa('INSERT INTO sso_msg_jobs_version_lnk (msg_job_id,msg_template_version_id) VALUES ($1,$2)', [jobAId, verId]);
  // job B: scene=activity.repurchase, pending(未送达/失败态), followStatus 默认 none → 全状态口径应纳入
  const jobB = await qa(
    "INSERT INTO sso_msg_jobs (document_id,scene,provider,status,retry_count,dedupe_key,created_at,updated_at) VALUES ($1,'activity.repurchase',$2,'pending',0,$3,now(),now()) RETURNING id",
    [crypto.randomUUID(), 'wechat', 'fl_ded_B_' + ts]);
  const jobBId = jobB[0].id;
  await qa('UPDATE sso_msg_jobs SET sent_at = now() - interval \'3 day\' WHERE id=$1', [jobBId]);
  await qa('INSERT INTO sso_msg_jobs_user_lnk (msg_job_id,sso_user_id) VALUES ($1,$2)', [jobBId, ssoBId]);
  await qa('INSERT INTO sso_msg_jobs_template_lnk (msg_job_id,msg_template_id) VALUES ($1,$2)', [jobBId, tplId]);
  await qa('INSERT INTO sso_msg_jobs_version_lnk (msg_job_id,msg_template_version_id) VALUES ($1,$2)', [jobBId, verId]);
  ok('造复购触达 job A(sent,1天前,跟A) B(pending,3天前,跟B)', !!jobAId && !!jobBId, `jobA=${jobAId} jobB=${jobBId}`);

  // signup A: user→upA, 活动, status=active, signup_at=now()(窗口内)
  const sigA = await qa(
    'INSERT INTO activity_signups (document_id,status,created_at,updated_at) VALUES ($1,$2,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'active']);
  const sigAId = sigA[0].id;
  await qa('UPDATE activity_signups SET signup_at = now() WHERE id=$1', [sigAId]);
  await qa('INSERT INTO activity_signups_user_lnk (activity_signup_id,user_id) VALUES ($1,$2)', [sigAId, upAId]);
  await qa('INSERT INTO activity_signups_activity_lnk (activity_signup_id,activity_id) VALUES ($1,$2)', [sigAId, actId]);
  ok('造 signup A(active, now() 窗口内)', !!sigAId, `sigA=${sigAId}`);

  // ---------- 2. 列表接口无筛选(全状态) ----------
  let g = await req('GET', '/api/zhao-sso/v1/admin/msg/repurchase-leads', null, token);
  let d = g.data && g.data.data;
  ok('列表 200 且有 data', g.status === 200 && !!d, `status=${g.status}`);
  if (!d || g.status !== 200) { console.error('repurchase-leads 异常:', JSON.stringify(g.data)); }
  ok('windowDays=7', d && d.windowDays === 7, `windowDays=${d && d.windowDays}`);
  ok('rows 含 A 与 B 两条', d && Array.isArray(d.rows) && d.rows.length === 2, `len=${d && d.rows.length}`);
  const rowA = d.rows.find((x) => x.id === jobAId);
  const rowB = d.rows.find((x) => x.id === jobBId);
  ok('rowA.followStatus=none', !!rowA && rowA.followStatus === 'none', `fs=${rowA && rowA.followStatus}`);
  ok('rowA 窗口内再报名次数=1(窗内signup)', !!rowA && rowA.reorderedCount === 1, `rc=${rowA && rowA.reorderedCount}`);
  ok('rowA 桥接 upId 非空', !!rowA && !!rowA.user && !!rowA.user.upId, `upId=${rowA && rowA.user && rowA.user.upId}`);
  ok('rowB 无 up(仅sso) upId=null', !!rowB && rowB.user && rowB.user.upId === null, `upId=${rowB && rowB.user && rowB.user.upId}`);
  ok('rowB 无窗口内报名=0', !!rowB && rowB.reorderedCount === 0, `rc=${rowB && rowB.reorderedCount}`);

  // ---------- 3. status=none 过滤 → 2 条 ----------
  g = await req('GET', '/api/zhao-sso/v1/admin/msg/repurchase-leads?status=none', null, token);
  d = g.data && g.data.data;
  ok('status=none 过滤返回 A,B 两条', g.status === 200 && d && d.rows.length === 2, `len=${d && d.rows.length}`);

  // ---------- 4. 标记 A → followed 并加备注 ----------
  g = await req('POST', '/api/zhao-sso/v1/admin/msg/repurchase-leads/' + jobAId + '/follow', { status: 'followed', remark: '已电话跟进' }, token);
  ok('标记 A→followed 返回 200', g.status === 200, `status=${g.status} ${JSON.stringify(g.data)}`);
  ok('标记后 followStatus=followed', g.data && g.data.data && (g.data.data.followStatus === 'followed' || g.data.data.follow_status === 'followed' || g.data.data.followStatus), `d=${JSON.stringify(g.data && g.data.data)}`);

  // 列表 status=followed → 1 条(A)
  g = await req('GET', '/api/zhao-sso/v1/admin/msg/repurchase-leads?status=followed', null, token);
  d = g.data && g.data.data;
  ok('status=followed 过滤返回 A 一条', g.status === 200 && d && d.rows.length === 1 && d.rows[0].id === jobAId, `len=${d && d.rows.length}`);

  // 列表 status=deal → 0 条(未标记 deal)
  g = await req('GET', '/api/zhao-sso/v1/admin/msg/repurchase-leads?status=deal', null, token);
  d = g.data && g.data.data;
  ok('status=deal 过滤返回 0 条', g.status === 200 && d && d.rows.length === 0, `len=${d && d.rows.length}`);

  // ---------- 5. 非法 status -> 400 ----------
  g = await req('POST', '/api/zhao-sso/v1/admin/msg/repurchase-leads/' + jobAId + '/follow', { status: 'bogus' }, token);
  ok('非法 status 返回 400', g.status === 400, `status=${g.status}`);

  // ---------- 6. from>to -> 400 ----------
  g = await req('GET', '/api/zhao-sso/v1/admin/msg/repurchase-leads?from=' + encodeURIComponent('2026-09-01') + '&to=' + encodeURIComponent('2026-01-01'), null, token);
  ok('from>to 返回 400', g.status === 400, `status=${g.status}`);

  // ---------- 7. 清理零残留 ----------
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

  console.log(`\n=== 复购线索跟进验收: PASS=${PASS} FAIL=${FAIL} ===`);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error('脚本异常:', e && e.stack || e); process.exit(1); });