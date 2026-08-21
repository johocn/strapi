/* SOP 触达漏斗报表验收 (Task 5)
 * 用法: cd e:\code\basic && node scripts/accept-sop-stats.cjs
 * 依赖: 本地 dev 1337 运行中(127.0.0.1:1337)，已重编译插件。
 * 覆盖:
 *  a) 默认查询(近30天): 按 scene 聚合各状态计数 + sentRate + 点击累计(+规则信息)
 *  b) q7_other 独立成行，不计入 q7_ev
 *  c) 区间外(35天前)不计入默认30天
 *  d) scratch scene 参数筛选
 *  e) 区间收缩后 35 天外不计
 *  f) from>to 返回 400
 *  g) 清理零残留(job/rule/template/version/user + 各 join lnk)
 * schema 要点(已对真实库核对):
 *  - sso_msg_jobs 无 user_id/template_id/version_id 列，关系经 join 表
 *    sso_msg_jobs_user_lnk(msg_job_id,sso_user_id) / sso_msg_jobs_template_lnk(msg_job_id,msg_template_id)
 *    / sso_msg_jobs_version_lnk(msg_job_id,msg_template_version_id)
 *  - sso_msg_template_versions 的 template 关系是 join 表
 *    sso_msg_template_versions_template_lnk(msg_template_version_id,msg_template_id)；含 document_id、click_count
 *  - created_at 为 timestamp(without tz)，用 now() - interval 相对时间构造区间内/外
 */
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const pg = require('pg');
const bcrypt = require(path.join(__dirname, '..', 'node_modules', 'bcryptjs'));

const BASE = 'http://127.0.0.1:1337';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PREFIX = 'q7_';
const PWD = 'Stats123';

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
  // job + 三张 join lnk bucket 删
  const jobs = await qa('SELECT id FROM sso_msg_jobs WHERE scene LIKE $1', [PREFIX + '%']);
  if (jobs.length) {
    const S = subIds(jobs.map((r) => r.id));
    await qa('DELETE FROM sso_msg_jobs_user_lnk WHERE msg_job_id IN ' + S);
    await qa('DELETE FROM sso_msg_jobs_template_lnk WHERE msg_job_id IN ' + S);
    await qa('DELETE FROM sso_msg_jobs_version_lnk WHERE msg_job_id IN ' + S);
    await qa('DELETE FROM sso_msg_jobs WHERE id IN ' + S);
  }
  // version(code)+ 其 template join lnk 删
  const ver = await qa('SELECT id FROM sso_msg_template_versions WHERE code LIKE $1', [PREFIX + '%']);
  if (ver.length) {
    const S = subIds(ver.map((r) => r.id));
    await qa('DELETE FROM sso_msg_template_versions_template_lnk WHERE msg_template_version_id IN ' + S);
    await qa('DELETE FROM sso_msg_template_versions WHERE id IN ' + S);
  }
  // 关联模板的 version lnk(兜底：template 已删但 lnk 残留)
  await qa('DELETE FROM sso_msg_template_versions_template_lnk WHERE msg_template_id IN (SELECT id FROM sso_msg_templates WHERE code LIKE $1)', [PREFIX + '%']);
  await qa('DELETE FROM sso_msg_templates WHERE code LIKE ' + "'" + PREFIX + "%'");
  await qa('DELETE FROM sso_sop_rules WHERE code LIKE ' + "'" + PREFIX + "%'");
  const us = await qa('SELECT id FROM sso_users WHERE username LIKE $1', [PREFIX + '%']);
  if (us.length) { const S = subIds(us.map((r) => r.id)); await qa('DELETE FROM sso_users WHERE id IN ' + S); }
}

(async () => {
  await cleanup(); // 预清理历史残留（幂等）

  // ---------- 0. admin 登录（zhao-auth） ----------
  let r = await req('POST', '/api/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  const token = r.data && (r.data.jwt || r.data.token || (r.data.data && r.data.data.token));
  ok('admin 登录', !!token, `status=${r.status}`);
  if (!token) { console.error('admin 登录失败，终止'); process.exit(1); }

  const ts = Date.now();

  // ---------- 1. 建模板 + 版本（clickCount=7，template 经 join 表） ----------
  const tpl = await qa(
    'INSERT INTO sso_msg_templates (document_id,code,name,provider,is_enabled,created_at,updated_at) VALUES ($1,$2,$3,$4,true,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'q7_tpl_' + ts, 'Q7模板', 'wechat']
  );
  const tplId = tpl[0].id;
  const ver = await qa(
    "INSERT INTO sso_msg_template_versions (document_id,code,name,click_count,sent_count,success_count,status,created_at,updated_at) VALUES ($1,$2,$3,7,50,40,'active',now(),now()) RETURNING id",
    [crypto.randomUUID(), 'q7_ver_' + ts, 'Q7版本']
  );
  const verId = ver[0].id;
  await qa('INSERT INTO sso_msg_template_versions_template_lnk (msg_template_version_id, msg_template_id) VALUES ($1,$2)', [verId, tplId]);
  ok('建模板+版本(click=7, 经 template join lnk)', !!verId, `verId=${verId}`);

  // ---------- 2. 建 sop-rule: scene=q7_ev, templateCode 指向模板 ----------
  const rule = await qa(
    'INSERT INTO sso_sop_rules (document_id,code,name,source,event,scene,template_code,enabled,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,true,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'q7_rule_' + ts, 'Q7规则', 'event', 'q7_event', 'q7_ev', 'q7_tpl_' + ts]
  );
  ok('建 sop-rule (scene=q7_ev, template_code)', !!rule[0].id, `ruleId=${rule[0].id}`);

  // ---------- 3. 建用户 ----------
  const hash = bcrypt.hashSync(PWD, 10);
  const u = await qa(
    'INSERT INTO sso_users (document_id,uuid,username,email,password_hash,status,register_channel,login_count,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,0,now(),now()) RETURNING id',
    [crypto.randomUUID(), crypto.randomUUID(), 'q7_' + ts, 'q7_' + ts + '@shenglin.vip', hash, 'active', 'accept']
  );
  const uid = u[0].id;
  ok('建用户', !!uid, `uid=${uid}`);

  // ---------- 4. 造 job：scene=q7_ev 各状态，created_at 部分在过去35天(区间外) ----------
  const inside = "interval '1 day'";   // 1天前（在近30天内）
  const outside = "interval '35 day'"; // 35天前（区间外）
  const mk = async (scene, status, atInterval) => {
    const j = await qa(
      "INSERT INTO sso_msg_jobs (document_id,scene,provider,status,retry_count,dedupe_key,created_at,updated_at) VALUES ($1,$2,$3,$4,0,$5,now() - " + atInterval + ",now()) RETURNING id",
      [crypto.randomUUID(), scene, 'wechat', status, 'q7_ded_' + scene + '_' + status + '_' + (Math.random() * 100000 | 0)]
    );
    const jid = j[0].id;
    await qa('INSERT INTO sso_msg_jobs_user_lnk (msg_job_id, sso_user_id) VALUES ($1,$2)', [jid, uid]);
    await qa('INSERT INTO sso_msg_jobs_template_lnk (msg_job_id, msg_template_id) VALUES ($1,$2)', [jid, tplId]);
    await qa('INSERT INTO sso_msg_jobs_version_lnk (msg_job_id, msg_template_version_id) VALUES ($1,$2)', [jid, verId]);
  };
  // 区间内: sent=4, failed=2, quota_limited=1, pending=1, cancelled=1
  for (let i = 0; i < 4; i++) await mk('q7_ev', 'sent', inside);
  await mk('q7_ev', 'failed', inside); await mk('q7_ev', 'failed', inside);
  await mk('q7_ev', 'quota_limited', inside);
  await mk('q7_ev', 'pending', inside);
  await mk('q7_ev', 'cancelled', inside);
  // 另一个 scene 独立成行，排除干扰
  await mk('q7_other', 'sent', inside);
  // 区间外(35天前) 5 条 sent 不计入默认30天
  for (let i = 0; i < 5; i++) await mk('q7_ev', 'sent', outside);
  ok('造 job 数据(含区间内外)成功', true);

  // ---------- 5. 默认查询（近30天, 全场景） ----------
  let g = await req('GET', '/api/zhao-sso/v1/admin/msg/sop-stats', null, token);
  let d = g.data && g.data.data;
  ok('默认查询 200 且有 data', g.status === 200 && !!d, `status=${g.status}`);
  const row = d && d.rows.find((x) => x.scene === 'q7_ev');
  ok('rows 含 q7_ev 且 total=9', !!row && row.total === 9, `total=${row && row.total}`);
  ok('q7_ev sent=4', row && row.sent === 4, `sent=${row && row.sent}`);
  ok('q7_ev failed=2', row && row.failed === 2, `failed=${row && row.failed}`);
  ok('q7_ev quotaLimited=1', row && row.quotaLimited === 1, `quota=${row && row.quotaLimited}`);
  ok('q7_ev pending=1', row && row.pending === 1, `pending=${row && row.pending}`);
  ok('q7_ev cancelled=1', row && row.cancelled === 1, `canc=${row && row.cancelled}`);
  ok('q7_ev sentRate=44', row && row.sentRate === Math.round(4 / 9 * 100), `rate=${row && row.sentRate}`);
  ok('q7_ev clicks=7(累计version.clickCount)', row && row.clicks === 7, `clicks=${row && row.clicks}`);
  ok('rows 含关联规则 code/name/templateCode', row && row.rules && row.rules[0] && row.rules[0].code && row.rules[0].templateCode === 'q7_tpl_' + ts, `rules=${JSON.stringify(row && row.rules)}`);
  ok('q7_other 独立成行(不计入 q7_ev)', d && !d.rows.some((x) => x.scene === 'q7_other' && x.scene === 'q7_ev') && d.rows.some((x) => x.scene === 'q7_other'), '');
  ok('summary 合计 total=9+1=10', d && d.summary.total === 10, `sumTotal=${d ? d.summary.total : '?'}`);
  ok('summary sent=5', d && d.summary.sent === 5, `sumSent=${d ? d.summary.sent : '?'}`);

  // ---------- 6. scene 筛选 ----------
  g = await req('GET', '/api/zhao-sso/v1/admin/msg/sop-stats?scene=q7_ev', null, token);
  d = g.data && g.data.data;
  ok('scene 筛选仅返回 q7_ev', d && d.rows.length === 1 && d.rows[0].scene === 'q7_ev', `len=${d ? d.rows.length : '?'}`);

  // ---------- 7. 区间收缩到最近2天→35天前不计（仍含1天前 inside，total=9） ----------
  const yFrom = encodeURIComponent(new Date(Date.now() - 2 * 86400000).toISOString());
  const yTo = encodeURIComponent(new Date(Date.now() - 0.5 * 86400000).toISOString());
  g = await req('GET', '/api/zhao-sso/v1/admin/msg/sop-stats?from=' + yFrom + '&to=' + yTo + '&scene=q7_ev', null, token);
  d = g.data && g.data.data;
  ok('区间收缩后 35 天外不计 total=9', d && d.rows[0] && d.rows[0].total === 9, `total=${d && d.rows[0] && d.rows[0].total}`);

  // ---------- 8. from>to → 400 ----------
  g = await req('GET', '/api/zhao-sso/v1/admin/msg/sop-stats?from=' + encodeURIComponent('2026-09-01') + '&to=' + encodeURIComponent('2026-01-01'), null, token);
  ok('from>to 返回 400', g.status === 400, `status=${g.status}`);

  // ---------- 9. 清理零残留 ----------
  await cleanup();
  const res = (await qa(`SELECT
      (SELECT count(*)::int FROM sso_msg_jobs WHERE scene LIKE $1) j,
      (SELECT count(*)::int FROM sso_sop_rules WHERE code LIKE $2) r,
      (SELECT count(*)::int FROM sso_msg_templates WHERE code LIKE $3) t,
      (SELECT count(*)::int FROM sso_msg_template_versions WHERE code LIKE $4) v,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE $5) u,
      (SELECT count(*)::int FROM sso_msg_template_versions_template_lnk WHERE msg_template_id IN (SELECT id FROM sso_msg_templates WHERE code LIKE $6)) vt,
      (SELECT count(*)::int FROM sso_msg_jobs_user_lnk WHERE msg_job_id IN (SELECT id FROM sso_msg_jobs WHERE scene LIKE $7)) ju,
      (SELECT count(*)::int FROM sso_msg_jobs_template_lnk WHERE msg_job_id IN (SELECT id FROM sso_msg_jobs WHERE scene LIKE $8)) jt,
      (SELECT count(*)::int FROM sso_msg_jobs_version_lnk WHERE msg_job_id IN (SELECT id FROM sso_msg_jobs WHERE scene LIKE $9)) jv`,
    [PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%']))[0];
  ok('清理零残留(job/rule/template/version/user + 各 join lnk 均 0)',
    res.j === 0 && res.r === 0 && res.t === 0 && res.v === 0 && res.u === 0 &&
    res.vt === 0 && res.ju === 0 && res.jt === 0 && res.jv === 0,
    `j=${res.j} r=${res.r} t=${res.t} v=${res.v} u=${res.u} vt=${res.vt} ju=${res.ju} jt=${res.jt} jv=${res.jv}`);

  console.log(`\n=== SOP 漏斗验收: PASS=${PASS} FAIL=${FAIL} ===`);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error('脚本异常:', e && e.message); process.exit(1); });