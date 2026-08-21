/* 课程完课转化归因 + 激活SOP 验收
 * 用法: cd e:\code\basic && node scripts/accept-course-completion.cjs
 * 依赖: 本地 dev 1337 运行中(127.0.0.1:1337)。
 *
 * Part 1: 完课转化归因（HTTP 可测）
 *   - course.d7 + course.activate 已送达 job → 窗口内任一 course-progress 完课即转化
 *   - windowDays 读 course.d7 规则 conversion_window_days
 *   - from>to -> 400
 * Part 2: 激活SOP 数据契约（runActivationReminderScan 为 cron 内部方法，无 HTTP 出口，
 *   故按 DB 契约/谓词验证）:
 *   - zhao_course_progresses 具备 completed_at / last_reminder_at 列
 *   - 扫描候选谓词(报名≥3天 enrolled + 无进度或进度<30 + 距上次学习/催学≥7天)用 SQL 复现断言命中/去重
 *
 * schema 要点(对真实库核对):
 *   - sso_msg_jobs 无 user 列, 关系经 join 表 sso_msg_jobs_user_lnk
 *   - course-progress 表 zhao_course_progresses, user/course 经
 *     zhao_course_progresses_user_lnk(course_progress_id,user_id) 与
 *     zhao_course_progresses_course_lnk(course_progress_id,course_id)（脚本动态解析 FK 列名）
 *   - 课程表 zhao_courses(title), 报名表 zhao_course_enrollments(user 经 user_lnk)
 */
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const pg = require('pg');
const bcrypt = require(path.join(__dirname, '..', 'node_modules', 'bcryptjs'));

const BASE = 'http://127.0.0.1:1337';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PREFIX = 'qc_';
const PWD = 'CourseComp';

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

// 动态解析 progress 表的 user/course FK 列名，并为 lnk 表显式分配不冲突的 id
//（lnk 表 id 走序列，若序列落后于存量行会导致"重复键违反主键"，故用 MAX+1 单调递增）
let PROG_USER_FK = 'course_progress_id', PROG_COURSE_FK = 'course_progress_id';
const seq = { zhao_course_progresses_user_lnk: 0, zhao_course_progresses_course_lnk: 0 };
async function resolveProgressFk() {
  const u = await qa("SELECT column_name FROM information_schema.columns WHERE table_name='zhao_course_progresses_user_lnk'");
  const c = await qa("SELECT column_name FROM information_schema.columns WHERE table_name='zhao_course_progresses_course_lnk'");
  PROG_USER_FK = u.map((x) => x.column_name).find((n) => !['id', 'user_id', 'sso_user_id', 'course_id'].includes(n)) || 'course_progress_id';
  PROG_COURSE_FK = c.map((x) => x.column_name).find((n) => !['id', 'user_id', 'sso_user_id', 'course_id'].includes(n)) || 'course_progress_id';
  for (const t of Object.keys(seq)) {
    const r = await qa('SELECT COALESCE(MAX(id),0)+1 m FROM ' + t);
    seq[t] = r[0].m;
  }
}
const nextId = (t) => seq[t]++;

async function cleanup() {
  // progress 记录(经 course-progress user lnk 定位 qc_ up_users)
  const pU = await qa('SELECT ' + PROG_USER_FK + ' AS pid FROM zhao_course_progresses_user_lnk WHERE user_id IN (SELECT id FROM up_users WHERE username LIKE $1)', [PREFIX + '%']);
  const pids = pU.map((r) => r.pid);
  if (pids.length) {
    const S = subIds(pids);
    await qa('DELETE FROM zhao_course_progresses_user_lnk WHERE ' + PROG_USER_FK + ' IN ' + S);
    await qa('DELETE FROM zhao_course_progresses_course_lnk WHERE ' + PROG_COURSE_FK + ' IN ' + S);
    await qa('DELETE FROM zhao_course_progresses WHERE id IN ' + S);
  }
  // enrollments + user lnk
  await qa('DELETE FROM zhao_course_enrollments_user_lnk WHERE user_id IN (SELECT id FROM up_users WHERE username LIKE $1)', [PREFIX + '%']);
  await qa('DELETE FROM zhao_course_enrollments WHERE id IN (SELECT course_enrollment_id FROM zhao_course_enrollments_user_lnk WHERE user_id IN (SELECT id FROM up_users WHERE username LIKE $1))', [PREFIX + '%']);
  // courses
  await qa('DELETE FROM zhao_courses WHERE title LIKE $1', [PREFIX + '%']);
  // up_users
  const up = await qa('SELECT id FROM up_users WHERE username LIKE $1', [PREFIX + '%']);
  if (up.length) await qa('DELETE FROM up_users WHERE id IN ' + subIds(up.map((r) => r.id)));
  // jobs + lnks
  const jobs = await qa('SELECT id FROM sso_msg_jobs WHERE dedupe_key LIKE $1', [PREFIX + '%']);
  if (jobs.length) {
    const S = subIds(jobs.map((r) => r.id));
    await qa('DELETE FROM sso_msg_jobs_user_lnk WHERE msg_job_id IN ' + S);
    await qa('DELETE FROM sso_msg_jobs_template_lnk WHERE msg_job_id IN ' + S);
    await qa('DELETE FROM sso_msg_jobs_version_lnk WHERE msg_job_id IN ' + S);
    await qa('DELETE FROM sso_msg_jobs WHERE id IN ' + S);
  }
  // versions + lnk
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

async function mkSsoUser(tag, ts) {
  const up = await qa(
    'INSERT INTO up_users (document_id,username,email,password,provider,confirmed,blocked,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,true,false,now(),now()) RETURNING id',
    [crypto.randomUUID(), PREFIX + tag + '_' + ts, PREFIX + tag.toLowerCase() + '_' + ts + '@qc.vip', bcrypt.hashSync(PWD, 10), 'local']
  );
  const upId = up[0].id;
  const sso = await qa(
    'INSERT INTO sso_users (document_id,uuid,username,email,password_hash,status,register_channel,login_count,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,0,now(),now()) RETURNING id',
    [crypto.randomUUID(), crypto.randomUUID(), PREFIX + tag + '_' + ts, PREFIX + tag.toLowerCase() + '_' + ts + '@qc.vip', bcrypt.hashSync(PWD, 10), 'active', 'accept']
  );
  return { upId, ssoId: sso[0].id };
}

async function mkProgress(userId, courseId, data) {
  const cols = ['document_id', 'progress', 'is_completed', 'created_at', 'updated_at'];
  const vals = [crypto.randomUUID(), data.progress ?? 0, data.is_completed ?? false, new Date(), new Date()];
  const extra = [['completed_at', data.completedAt], ['last_study_at', data.lastStudyAt], ['last_reminder_at', data.lastReminderAt], ['total_lessons', data.totalLessons]];
  for (const [col, v] of extra) if (v !== undefined) { cols.push(col); vals.push(v); }
  const ph = cols.map((_, i) => '$' + (i + 1)).join(',');
  const r = await qa('INSERT INTO zhao_course_progresses (' + cols.join(',') + ') VALUES (' + ph + ') RETURNING id', vals);
  const id = r[0].id;
  // lnk 表 id 显式分配(见 seq), 规避序列落后于存量行导致的唯一冲突
  await qa('INSERT INTO zhao_course_progresses_user_lnk (id,' + PROG_USER_FK + ',user_id) VALUES ($1,$2,$3)', [nextId('zhao_course_progresses_user_lnk'), id, userId]);
  await qa('INSERT INTO zhao_course_progresses_course_lnk (id,' + PROG_COURSE_FK + ',course_id) VALUES ($1,$2,$3)', [nextId('zhao_course_progresses_course_lnk'), id, courseId]);
  return id;
}

(async () => {
  await resolveProgressFk();
  await cleanup();

  // ---------- 0. admin 登录 ----------
  let r = await req('POST', '/api/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  const token = r.data && (r.data.jwt || r.data.token || (r.data.data && r.data.data.token));
  ok('admin 登录', !!token, `status=${r.status}`);
  if (!token) { console.error('admin 登录失败，终止'); process.exit(1); }

  const ts = Date.now();

  // ---------- 1. 基础种子: 模板+active版本, course.d7 规则(window=7), course.activate 规则(启用) ----------
  const tpl = await qa(
    'INSERT INTO sso_msg_templates (document_id,code,name,provider,is_enabled,created_at,updated_at) VALUES ($1,$2,$3,$4,true,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'qc_tpl_' + ts, 'QC模板', 'wechat']
  );
  const tplId = tpl[0].id;
  const ver = await qa(
    "INSERT INTO sso_msg_template_versions (document_id,code,name,status,created_at,updated_at) VALUES ($1,$2,$3,'active',now(),now()) RETURNING id",
    [crypto.randomUUID(), 'qc_ver_' + ts, 'QC版本']
  );
  const verId = ver[0].id;
  await qa('INSERT INTO sso_msg_template_versions_template_lnk (msg_template_version_id, msg_template_id) VALUES ($1,$2)', [verId, tplId]);
  ok('建模板+active版本', !!verId, `tplId=${tplId} verId=${verId}`);

  await qa(
    'INSERT INTO sso_sop_rules (document_id,code,name,source,scene,template_code,conversion_window_days,enabled,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,true,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'qc_rule_d7_' + ts, 'QC完课D7', 'cron', 'course.d7', 'qc_tpl_' + ts, 7]
  );
  await qa(
    'INSERT INTO sso_sop_rules (document_id,code,name,source,scene,template_code,conversion_window_days,enabled,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,true,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'qc_rule_act_' + ts, 'QC激活', 'cron', 'course.activate', 'qc_tpl_' + ts, 7]
  );
  ok('建 course.d7(conversion_window_days=7) 与 course.activate 规则', true);

  const course = await qa(
    'INSERT INTO zhao_courses (document_id,title,created_at,updated_at) VALUES ($1,$2,now(),now()) RETURNING id',
    [crypto.randomUUID(), PREFIX + 'course1_' + ts]
  );
  const courseId = course[0].id;
  ok('建课程', !!courseId, `courseId=${courseId}`);

  const mkJob = (scene, agoDays, user, tag, ts) => qa(
    "INSERT INTO sso_msg_jobs (document_id,scene,provider,status,retry_count,dedupe_key,created_at,updated_at) VALUES ($1,$2,$3,'sent',0,$4,now(),now()) RETURNING id",
    [crypto.randomUUID(), scene, 'wechat', 'qc_ded_' + tag + '_' + ts]
  ).then((x) => x[0].id).then(async (id) => {
    await qa("UPDATE sso_msg_jobs SET sent_at = now() - interval '" + agoDays + " day' WHERE id=$1", [id]);
    await qa('INSERT INTO sso_msg_jobs_user_lnk (msg_job_id,sso_user_id) VALUES ($1,$2)', [id, user]);
    await qa('INSERT INTO sso_msg_jobs_template_lnk (msg_job_id,msg_template_id) VALUES ($1,$2)', [id, tplId]);
    await qa('INSERT INTO sso_msg_jobs_version_lnk (msg_job_id,msg_template_version_id) VALUES ($1,$2)', [id, verId]);
    return id;
  });

  // ---------- 2. 完课转化: A(course.d7, 1天前送达, 10分钟前完课=窗口内), B(course.activate, 2天前送达, 1天前完课=窗口内) ----------
  const A = await mkSsoUser('A', ts);
  const jobA = await mkJob('course.d7', 1, A.ssoId, 'A', ts);
  const progA = await mkProgress(A.upId, courseId, { progress: 100, is_completed: true, completedAt: new Date(Date.now() - 10 * 60000), totalLessons: 5 });
  ok('造A: course.d7触达(1天前)+完课(10分钟前,窗口内)', !!jobA && !!progA, `jobA=${jobA}`);

  const B = await mkSsoUser('B', ts);
  const jobB = await mkJob('course.activate', 2, B.ssoId, 'B', ts);
  const progB = await mkProgress(B.upId, courseId, { progress: 100, is_completed: true, completedAt: new Date(Date.now() - 1 * 86400000), totalLessons: 5 });
  ok('造B: course.activate触达(2天前)+完课(1天前,窗口内)', !!jobB && !!progB, `jobB=${jobB}`);

  // C: course.d7 8天前送达, 6小时前完课 => completed=sent_at+7.75天, 窗口外
  const C = await mkSsoUser('C', ts);
  const jobC = await mkJob('course.d7', 8, C.ssoId, 'C', ts);
  const progC = await mkProgress(C.upId, courseId, { progress: 100, is_completed: true, completedAt: new Date(Date.now() - 6 * 3600000), totalLessons: 5 });
  ok('造C: course.d7触达(8天前)+完课(6小时前,窗口外)', !!jobC && !!progC, `jobC=${jobC}`);

  // ---------- 3. 窄窗口查询(近3天): 仅 A、B 触达在窗口, 均转化 ----------
  let g = await req('GET', '/api/zhao-sso/v1/admin/msg/course-completion-stats?from=' + encodeURIComponent(new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)) + '&to=' + encodeURIComponent(new Date().toISOString().slice(0, 10)), null, token);
  let d = g.data && g.data.data;
  ok('窄窗口 200 且有 data', g.status === 200 && !!d, `status=${g.status}`);
  ok('窄窗口 windowDays=7', d && d.windowDays === 7, `windowDays=${d && d.windowDays}`);
  ok('窄窗口 sent=2(仅A/B)', d && d.summary.sent === 2, `sent=${d && d.summary.sent}`);
  ok('窄窗口 convertedUsers=2', d && d.summary.convertedUsers === 2, `cu=${d && d.summary.convertedUsers}`);
  ok('窄窗口 conversions=2', d && d.summary.conversions === 2, `cv=${d && d.summary.conversions}`);
  ok('窄窗口 conversionRate=100', d && d.summary.conversionRate === 100, `rate=${d && d.summary.conversionRate}`);

  // ---------- 4. 默认查询(近30天): A/B/C 全在, C 不计转化 ----------
  g = await req('GET', '/api/zhao-sso/v1/admin/msg/course-completion-stats', null, token);
  d = g.data && g.data.data;
  ok('默认查询 200', g.status === 200 && !!d, `status=${g.status}`);
  ok('默认 sent=3', d && d.summary.sent === 3, `sent=${d && d.summary.sent}`);
  ok('默认 convertedUsers=2(仅A/B)', d && d.summary.convertedUsers === 2, `cu=${d && d.summary.convertedUsers}`);
  ok('默认 conversions=2', d && d.summary.conversions === 2, `cv=${d && d.summary.conversions}`);
  ok('默认 conversionRate=67', d && d.summary.conversionRate === 67, `rate=${d && d.summary.conversionRate}`);

  // ---------- 5. from>to -> 400 ----------
  g = await req('GET', '/api/zhao-sso/v1/admin/msg/course-completion-stats?from=' + encodeURIComponent('2026-09-01') + '&to=' + encodeURIComponent('2026-01-01'), null, token);
  ok('from>to 返回 400', g.status === 400, `status=${g.status}`);

  // ---------- 6. 激活SOP 数据契约 ----------
  const cols = (await qa("SELECT column_name FROM information_schema.columns WHERE table_name='zhao_course_progresses'")).map((x) => x.column_name);
  ok('course-progress 含 completed_at 列', cols.includes('completed_at'));
  ok('course-progress 含 last_reminder_at 列', cols.includes('last_reminder_at'));

  // D: 报名字段(daysMS=30天前, enrolled), 无进度记录 -> 扫描候选(无进度, 距报名≥3天)
  const D = await mkSsoUser('D', ts);
  const enrD = await qa(
    'INSERT INTO zhao_course_enrollments (document_id,status,enroll_type,created_at,updated_at) VALUES ($1,$2,$3,now(),now()) RETURNING id',
    [crypto.randomUUID(), 'enrolled', 'free']
  );
  await qa('UPDATE zhao_course_enrollments SET enrolled_at = now() - interval \'30 day\' WHERE id=$1', [enrD[0].id]);
  await qa('INSERT INTO zhao_course_enrollments_user_lnk (course_enrollment_id,user_id) VALUES ($1,$2)', [enrD[0].id, D.upId]);
  // 桥接匹配: 有启用 course.activate 规则 + sso_users 匹配 username -> 候选
  const candNoProg = (await qa(`SELECT count(*)::int c FROM zhao_course_enrollments e
      WHERE e.status='enrolled' AND e.enrolled_at <= now()-interval '3 day'
        AND e.id IN (SELECT course_enrollment_id FROM zhao_course_enrollments_user_lnk WHERE user_id=$1)`,
    [D.upId]))[0].c;
  ok('D(报名30天前,无进度) 命中 enrolled+≥3天', candNoProg === 1, `c=${candNoProg}`);

  // 加进度 progress=10, last_study_at=30天前, 无 last_reminder_at -> 仍候选(进度<30, 距学习/催学≥7天)
  const progD = await mkProgress(D.upId, courseId, { progress: 10, is_completed: false, lastStudyAt: new Date(Date.now() - 30 * 86400000), totalLessons: 10 });
  const candLow = (await qa(`SELECT count(*)::int c FROM zhao_course_progresses p
      WHERE p.id=$1 AND p.is_completed=false AND (p.progress IS NULL OR p.progress::numeric<30)
        AND (p.last_study_at IS NULL OR p.last_study_at<=now()-interval '7 day')
        AND (p.last_reminder_at IS NULL OR p.last_reminder_at<=now()-interval '7 day')`, [progD]))[0].c;
  ok('D 加进度10%(30天未学,未催) 命中 进度<30+7天冷却', candLow === 1, `c=${candLow}`);

  // 回写 last_reminder_at=now() -> 7天内不再催(去重)
  await qa('UPDATE zhao_course_progresses SET last_reminder_at=now() WHERE id=$1', [progD]);
  const dup = (await qa(`SELECT count(*)::int c FROM zhao_course_progresses p
      WHERE p.id=$1 AND p.is_completed=false AND (p.progress IS NULL OR p.progress::numeric<30)
        AND (p.last_study_at IS NULL OR p.last_study_at<=now()-interval '7 day')
        AND (p.last_reminder_at IS NULL OR p.last_reminder_at<=now()-interval '7 day')`, [progD]))[0].c;
  ok('D 回写 last_reminder_at 后 7天内去重(不再候选)', dup === 0, `c=${dup}`);

  // E: 进度50% -> 不处于"进度<30"免催
  const E = await mkSsoUser('E', ts);
  const progE = await mkProgress(E.upId, courseId, { progress: 50, is_completed: false, lastStudyAt: new Date(Date.now() - 30 * 86400000), totalLessons: 10 });
  const candHi = (await qa(`SELECT count(*)::int c FROM zhao_course_progresses p
      WHERE p.id=$1 AND p.is_completed=false AND (p.progress IS NULL OR p.progress::numeric<30)
        AND (p.last_study_at IS NULL OR p.last_study_at<=now()-interval '7 day')
        AND (p.last_reminder_at IS NULL OR p.last_reminder_at<=now()-interval '7 day')`, [progE]))[0].c;
  ok('E 进度50% 免催(进度≥30)', candHi === 0, `c=${candHi}`);

  // ---------- 7. 清理零残留 ----------
  await cleanup();
  const rc = (await qa(`SELECT
      (SELECT count(*)::int FROM sso_msg_jobs WHERE dedupe_key LIKE $1) j,
      (SELECT count(*)::int FROM sso_sop_rules WHERE code LIKE $2) r2,
      (SELECT count(*)::int FROM sso_msg_templates WHERE code LIKE $3) t,
      (SELECT count(*)::int FROM sso_msg_template_versions WHERE code LIKE $4) v,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE $5) u,
      (SELECT count(*)::int FROM up_users WHERE username LIKE $6) uu,
      (SELECT count(*)::int FROM zhao_course_progresses WHERE id IN (SELECT ${PROG_USER_FK} FROM zhao_course_progresses_user_lnk WHERE user_id IN (SELECT id FROM up_users WHERE username LIKE $7))) p,
      (SELECT count(*)::int FROM zhao_courses WHERE title LIKE $8) c`,
    [PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%', PREFIX + '%']))[0];
  ok('清理零残留(job/rule/template/version/sso_user/up_user/progress/course 均 0)',
    rc.j === 0 && rc.r2 === 0 && rc.t === 0 && rc.v === 0 && rc.u === 0 && rc.uu === 0 && rc.p === 0 && rc.c === 0,
    `j=${rc.j} r=${rc.r2} t=${rc.t} v=${rc.v} u=${rc.u} uu=${rc.uu} p=${rc.p} c=${rc.c}`);

  console.log(`\n=== 课程完课转化归因+激活SOP 验收: PASS=${PASS} FAIL=${FAIL} ===`);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error('脚本异常:', e && e.stack || e); process.exit(1); });