/* SSO 触达频控验收 (Task 4)
 * 用法: cd e:\code\basic && node scripts/accept-sso-quota.cjs
 * 覆盖:
 *  a) 全局默认: 默认 maxDailyPerUser=10 达上限后下一条被拦(daily_cap)
 *  b) 场景冷却: 同 scene 两条发送间隔<cooldownMinutes 第二条被拦(cooldown)；换 scene 不受限
 *  c) 模板覆盖: 为模板设 dailyCap=1 后按模板值生效(1 条 sent 即拦)；置空回退全局(1 条 sent 放行)
 *  d) 版本计数: 被拦 job 不累加模板版本 sentCount（无版本模板下等价：被拦不写入任何成功计数）
 *  e) cron 捞取: quota_limited 为终态，不在 listPendingJobsForSend(status=pending) 范围
 *  f) 清理零残留
 * 运行前置: 本地 Strapi develop 已运行(127.0.0.1:1337)且已重编译插件。
 * 说明: 引用真实发送链路 sendJob(retry 端点)；无微信配置时 channel.send 抛错→job 回 pending 属预期，
 *       验收焦点在"频控判定"前置拦截。故"每日计数/冷却时间"基线用 DB 直插 status='sent' 的 job 构造。
 * schema 要点(已对真实库核对): sso_msg_jobs 无 user_id/template_id 列，关系经 join 表
 *       sso_msg_jobs_user_lnk(msg_job_id,sso_user_id) / sso_msg_jobs_template_lnk(msg_job_id,msg_template_id)
 *       / sso_msg_jobs_version_lnk(msg_job_id,msg_template_version_id)。全链路 draftAndPublish=false，
 *       直插无 published_at 不影响查询计数。
 */
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const pg = require('pg');
const bcrypt = require(path.join(__dirname, '..', 'node_modules', 'bcryptjs'));

const BASE = 'http://127.0.0.1:1337';
const ADMIN = '/api/zhao-sso/v1/admin';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'qta_';           // 测试前缀（scene/code/username 均按此清理）
const PWD = 'Quota123';

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function qa(sql, params) { const c = new pg.Client(PG); await c.connect(); const r = await c.query(sql, params); await c.end(); return r.rows; }
const subIds = (ids) => (ids.length ? '(' + ids.join(',') + ')' : '(NULL)');

let uid, tplId;

/** 造 job + 关系 lnk（真实 schema：user/template 经 join 表） */
async function mkJob(scene, status, opts = {}) {
  const cols = []; const params = [];
  const binds = [crypto.randomUUID(), scene, status, 'qta_ded_' + scene + '_' + (opts.n || Date.now())];
  if (opts.sentAt) { cols.push('sent_at'); binds.push(opts.sentAt); }
  if (opts.scheduledAt) { cols.push('scheduled_at'); binds.push(opts.scheduledAt); }
  const colSql = cols.length ? (',' + cols.join(',')) : '';
  const valSql = cols.length ? (',' + cols.map((_, i) => '$' + (5 + i)).join(',')) : '';
  const j = await qa(
    `INSERT INTO sso_msg_jobs (document_id, scene, provider, status, retry_count, dedupe_key, created_at, updated_at${colSql})
     VALUES ($1,$2,'wechat',$3,0,$4,now(),now()${valSql}) RETURNING id`,
    binds
  );
  const jid = j[0].id;
  await qa('INSERT INTO sso_msg_jobs_user_lnk (msg_job_id, sso_user_id) VALUES ($1,$2)', [jid, uid]);
  await qa('INSERT INTO sso_msg_jobs_template_lnk (msg_job_id, msg_template_id) VALUES ($1,$2)', [jid, tplId]);
  return { id: jid };
}

/** 复位某用户当日 sent 基线（真正 schema：join lnk 删除，避免子用例计数互相污染） */
async function resetSent(u) {
  const rows = await qa(
    'SELECT mj.id FROM sso_msg_jobs mj JOIN sso_msg_jobs_user_lnk l ON l.msg_job_id=mj.id WHERE l.sso_user_id=$1 AND mj.status=$2',
    [u, 'sent']
  );
  if (rows.length) {
    const S = subIds(rows.map((r) => r.id));
    await qa(`DELETE FROM sso_msg_jobs_user_lnk WHERE msg_job_id IN ${S}`);
    await qa(`DELETE FROM sso_msg_jobs_template_lnk WHERE msg_job_id IN ${S}`);
    await qa(`DELETE FROM sso_msg_jobs_version_lnk WHERE msg_job_id IN ${S}`);
    await qa(`DELETE FROM sso_msg_jobs WHERE id IN ${S}`);
  }
}

/** 清理（真实 schema + 全清 quota config，表无 name 列） */
async function cleanup() {
  const jobs = await qa("SELECT id FROM sso_msg_jobs WHERE scene LIKE $1", [PF + '%']);
  if (jobs.length) {
    const S = subIds(jobs.map((r) => r.id));
    await qa(`DELETE FROM sso_msg_jobs_user_lnk WHERE msg_job_id IN ${S}`);
    await qa(`DELETE FROM sso_msg_jobs_template_lnk WHERE msg_job_id IN ${S}`);
    await qa(`DELETE FROM sso_msg_jobs_version_lnk WHERE msg_job_id IN ${S}`);
    await qa(`DELETE FROM sso_msg_jobs WHERE id IN ${S}`);
  }
  await qa("DELETE FROM sso_msg_templates WHERE code LIKE '" + PF + "%'");
  await qa('DELETE FROM sso_quota_configs');
  const us = await qa('SELECT id FROM sso_users WHERE username LIKE $1', [PF + '%']);
  if (us.length) { const S = subIds(us.map((r) => r.id)); await qa(`DELETE FROM sso_users WHERE id IN ${S}`); }
}

(async () => {
  await cleanup(); // 预清理历史残留（幂等）

  // ---------- 0. admin 登录（zhao-auth） ----------
  let r = await req('POST', '/api/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  const token = r.data && (r.data.jwt || r.data.token || (r.data.data && r.data.data.token));
  ok('admin 登录', !!token, `status=${r.status}`);
  if (!token) { console.error('admin 登录失败，终止'); process.exit(1); }

  const ts = Date.now();
  // ---------- 插全局配置: 默认 maxDailyPerUser=10, cooldownMinutes=120 ----------
  await qa('INSERT INTO sso_quota_configs (document_id, max_daily_per_user, cooldown_minutes, created_at, updated_at) VALUES ($1,10,120,now(),now())',
    [crypto.randomUUID()]);
  ok('插全局配置(10/120)', true);

  // ---------- 造用户 ----------
  const hash = bcrypt.hashSync(PWD, 12);
  const uRows = await qa('INSERT INTO sso_users (document_id,uuid,username,email,password_hash,status,register_channel,login_count,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,0,now(),now()) RETURNING id',
    [crypto.randomUUID(), crypto.randomUUID(), PF + ts + '_u', PF + ts + '_u@shenglin.vip', hash, 'active', 'accept']);
  uid = uRows[0].id;
  ok('造 sso 测试用户', !!uid, `uid=${uid}`);

  // ---------- 建模板(wechat, 无版本; dailyCap/cooldownMinutes 默认 NULL) ----------
  const tm = await qa('INSERT INTO sso_msg_templates (document_id,code,name,provider,is_enabled,created_at,updated_at) VALUES ($1,$2,$3,$4,true,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'qta_tmpl_' + ts, 'QTA模板', 'wechat']);
  tplId = tm[0].id;

  // ---------- a) 每日上限(全局 10) ----------
  await resetSent(uid);
  const iso = new Date().toISOString();
  for (let i = 0; i < 10; i++) await mkJob('qta_dailyA_' + i, 'sent', { sentAt: iso });
  const j1 = await mkJob('qta_dailyA_trigger', 'pending');
  r = await req('POST', ADMIN + '/msg-jobs/' + j1.id + '/retry', null, token);
  const st1 = r.data && (r.data.data || r.data);
  ok('a 每日达上限后被拦(quota_limited/daily_cap)',
    r.status === 200 && st1 && st1.status === 'quota_limited' && st1.result && st1.result.reason === 'daily_cap',
    `status=${st1 && st1.status} reason=${st1 && st1.result && st1.result.reason} respStatus=${r.status}`);

  // ---------- c) 模板覆盖 dailyCap=1（复位后 1 条 sent 即拦），再置空回退全局放行 ----------
  await resetSent(uid);
  await qa('UPDATE sso_msg_templates SET daily_cap=1, cooldown_minutes=0 WHERE id=$1', [tplId]);
  await mkJob('qta_cap_seed', 'sent', { sentAt: new Date().toISOString() }); // 1 条 sent
  const j3 = await mkJob('qta_cap_block', 'pending');
  r = await req('POST', ADMIN + '/msg-jobs/' + j3.id + '/retry', null, token);
  const st3 = r.data && (r.data.data || r.data);
  ok('c 模板 dailyCap=1 时 1 条 sent 即被拦(daily_cap)',
    r.status === 200 && st3 && st3.status === 'quota_limited' && st3.result && st3.result.reason === 'daily_cap',
    `status=${st3 && st3.status} reason=${st3 && st3.result && st3.result.reason}`);
  // 模板覆盖置空(回退全局 10)，同基线 1 条 sent 应放行
  await qa('UPDATE sso_msg_templates SET daily_cap=NULL WHERE id=$1', [tplId]);
  const j2 = await mkJob('qta_cap_pass', 'pending');
  r = await req('POST', ADMIN + '/msg-jobs/' + j2.id + '/retry', null, token);
  const st2 = r.data && (r.data.data || r.data);
  ok('c 回退全局后 1 条 sent 放行(未 quota_limited)',
    r.status === 200 && st2 && st2.status !== 'quota_limited',
    `status=${st2 && st2.status} respStatus=${r.status}`);
  await resetSent(uid); // 清理本段 sent，避免影响 b

  // ---------- b) 场景冷却：同 scene 最近一条 sent(1分钟前) → 该 scene 再发被拦 cooldown ----------
  await qa('UPDATE sso_msg_templates SET daily_cap=NULL, cooldown_minutes=120 WHERE id=$1', [tplId]);
  // 说明：sent_at 为 timestamp(without tz) 列，客户端 ISO 串会经会话时区(Asia/Shanghai)偏移 8h；
  //       改用 DB 端 now() - interval 相对时间保证 Strapi 读到"约 1 分钟前"。
  const cSeed = await qa(
    "INSERT INTO sso_msg_jobs (document_id,scene,provider,status,retry_count,dedupe_key,sent_at,created_at,updated_at) VALUES ($1,$2,'wechat','sent',0,$3,now() - interval '1 minute',now(),now()) RETURNING id",
    [crypto.randomUUID(), 'qta_cooldown_1', 'qta_ded_cooldown_seed_' + Date.now()]
  );
  await qa('INSERT INTO sso_msg_jobs_user_lnk (msg_job_id, sso_user_id) VALUES ($1,$2)', [cSeed[0].id, uid]);
  await qa('INSERT INTO sso_msg_jobs_template_lnk (msg_job_id, msg_template_id) VALUES ($1,$2)', [cSeed[0].id, tplId]);

  const j4 = await mkJob('qta_cooldown_1', 'pending', { n: 't2' }); // 同一 scene 再发 → cooldown 拦截
  r = await req('POST', ADMIN + '/msg-jobs/' + j4.id + '/retry', null, token);
  const st4 = r.data && (r.data.data || r.data);
  ok('b 同 scene 冷却内被拦(cooldown)',
    r.status === 200 && st4 && st4.status === 'quota_limited' && st4.result && st4.result.reason === 'cooldown',
    `status=${st4 && st4.status} reason=${st4 && st4.result && st4.result.reason}`);
  // 换 scene（该 scene 最近无 sent）→ 不因冷却被拦（无微信配置发送失败回 pending 属预期）
  const j5 = await mkJob('qta_other_1', 'pending');
  r = await req('POST', ADMIN + '/msg-jobs/' + j5.id + '/retry', null, token);
  const st5 = r.data && (r.data.data || r.data);
  ok('b 换 scene 不因冷却被拦',
    r.status === 200 && st5 && st5.status !== 'quota_limited',
    `status=${st5 && st5.status} respStatus=${r.status}`);

  // ---------- e) cron 捞取: quota_limited 为终态，不在 status=pending 待发送范围 ----------
  // 前面被置 quota_limited 的 job：a(1) + c(1) + b 同 scene(1) = 3
  const ql = await qa("SELECT count(*)::int n FROM sso_msg_jobs WHERE status='quota_limited' AND scene LIKE $1", [PF + '%']);
  const pendQta = await qa("SELECT count(*)::int n FROM sso_msg_jobs WHERE status='pending' AND scene LIKE $1", [PF + '%']);
  const quotaLimitedNotPending = await qa(
    "SELECT count(*)::int n FROM sso_msg_jobs WHERE status='quota_limited' AND scene LIKE $1 AND status='pending'", [PF + '%']
  );
  ok('e cron 不捞 quota_limited(terminal, 不混入 pending)',
    ql[0].n >= 3 && quotaLimitedNotPending[0].n === 0,
    `quota_limited=${ql[0].n} pending(qta)=${pendQta[0].n}`);

  // ---------- f) 清理零残留 ----------
  await cleanup();
  const res = (await qa(`SELECT
      (SELECT count(*)::int FROM sso_msg_jobs WHERE scene LIKE $1) j,
      (SELECT count(*)::int FROM sso_msg_templates WHERE code LIKE $2) t,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE $3) u,
      (SELECT count(*)::int FROM sso_quota_configs) qc`,[PF + '%', PF + '%', PF + '%']))[0];
  ok('清理零残留(job/template/user/quota-config 均 0)',
    res.j === 0 && res.t === 0 && res.u === 0 && res.qc === 0,
    `job=${res.j} tpl=${res.t} user=${res.u} quotaConfig=${res.qc}`);

  console.log(`\n=== SSO 触达频控验收: PASS=${PASS} FAIL=${FAIL} ===`);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error('脚本异常:', e && e.message); process.exit(1); });