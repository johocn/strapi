/* 租户 featureFlags(exam/activity/roleGate) + 模块可见性 + roleGate/visibleToRoles 强角色门控 验收
 * 用法: cd e:\code\basic && node scripts/accept-tenant-exam-activity-rolegate.cjs
 * 依赖: 本地 dev 1337 运行中(127.0.0.1:1337), zhao-common/zhao-course/zhao-point/zhao-quiz 插件
 *       均已 npm run build 重建 dist。
 *
 * 覆盖(Plan Task 8):
 *   1) 公开配置 GET /api/zhao-common/v1/public/config?domain=<测试站>  断言 featureFlags 含
 *      exam/activity/roleGate; roleGate 开/关随站点 featureFlags 联动; moduleGrantedForCurrentTenant
 *      为对象且值全为 boolean。
 *   2) roleGate+visibleToRoles 过滤(课程/考试公开列表能解析 Bearer token, 活动公开列表不解析 token,
 *      故区分游客/登录用户的场景走课程与考试; 活动覆盖游客场景):
 *        - 游客: roleGate 开 + 受限项(hidden) 不可见, 开放项可见
 *        - 登录普通用户(roles=['user']): 受限项仍不可见
 *        - 登录授权用户(roles=['instructor']): 受限项可见
 *        - roleGate 关: 受限项对游客/登录用户均可见(无门控)
 *   3) 收尾清理所有测试数据(课程/活动/考试/站点配置/测试用户)并断言零残留。
 *
 * 约定: 所有公开/配置请求带 ?domain=<测试站域名> 以命中 site-resolver, 让 roleGate 依赖的
 *       siteDocumentId 指向本次新建的测试站点(不影响默认站点数据)。
 */
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const pg = require('pg');
const bcrypt = require(path.join(__dirname, '..', 'node_modules', 'bcryptjs'));

const BASE = 'http://127.0.0.1:1337';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };

const PREFIX = 'rga_';          // 课程/活动/考试 title 前缀
const SITENM = 'rga-site';      // 站点 site_name 前缀
const UPF = 'rga_user_';        // 测试用户 username 前缀
const PWD = 'RoleGate123';
const DOMAIN = 'rga-' + Date.now() + '.local'; // 唯一站点域名
const AUTHED_ROLE = 'instructor';              // 受限项可见角色

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

// 公开路由统一带站点标识
const pub = (p) => p + (p.includes('?') ? '&' : '?') + 'domain=' + DOMAIN;

async function qa(sql, params) {
  const c = new pg.Client(PG); await c.connect();
  const r = await c.query(sql, params); await c.end(); return r.rows;
}

function featureFlagsJson(roleGate) {
  return JSON.stringify({
    sso: false, points: true, quiz: true, course: true, channel: true,
    thirdParty: true, oss: false, website: true, logistics: true, studio: true,
    exam: true, activity: true, roleGate,
  });
}

async function cleanup() {
  // 测试用户 up_users
  const ups = (await qa('SELECT id FROM up_users WHERE username LIKE $1', [UPF + '%'])).map((r) => r.id);
  if (ups.length) {
    const U = '(' + ups.join(',') + ')';
    // 报名/进度等关联表(本脚本一般不产生, 但保险起见清一次)
    await qa(`DELETE FROM zhao_course_enrollments_user_lnk WHERE user_id IN ${U}`).catch(() => {});
    await qa(`DELETE FROM zhao_course_progresses_user_lnk WHERE user_id IN ${U}`).catch(() => {});
    await qa(`DELETE FROM activity_signups_user_lnk WHERE user_id IN ${U}`).catch(() => {});
    await qa('DELETE FROM up_users WHERE id IN ' + U).catch(() => {});
  }
  await qa('DELETE FROM sso_users WHERE username LIKE $1', [UPF + '%']);

  // 课程(published/draft 快照同行删) + 可能的关系 lnk
  const cs = (await qa('SELECT id FROM zhao_courses WHERE title LIKE $1', [PREFIX + '%'])).map((r) => r.id);
  if (cs.length) {
    const C = '(' + cs.join(',') + ')';
    await qa(`DELETE FROM zhao_courses_category_lnk WHERE course_id IN ${C}`).catch(() => {});
    await qa(`DELETE FROM zhao_courses_sequence_tag_lnk WHERE course_id IN ${C}`).catch(() => {});
    await qa(`DELETE FROM zhao_courses_tags_lnk WHERE course_id IN ${C}`).catch(() => {});
    await qa('DELETE FROM zhao_courses WHERE id IN ' + C).catch(() => {});
  }
  // 活动
  const ac = (await qa('SELECT id FROM activities WHERE title LIKE $1', [PREFIX + '%'])).map((r) => r.id);
  if (ac.length) {
    const A = '(' + ac.join(',') + ')';
    await qa(`DELETE FROM activity_signups_activity_lnk WHERE activity_id IN ${A}`).catch(() => {});
    await qa(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_id IN ${A}`).catch(() => {});
    await qa('DELETE FROM activities WHERE id IN ' + A).catch(() => {});
  }
  // 考试
  const ex = (await qa('SELECT id FROM zhao_quiz_exams WHERE title LIKE $1', [PREFIX + '%'])).map((r) => r.id);
  if (ex.length) {
    const E = '(' + ex.join(',') + ')';
    await qa(`DELETE FROM zhao_quiz_exams_questions_lnk WHERE quiz_exam_id IN ${E}`).catch(() => {});
    await qa('DELETE FROM zhao_quiz_exams WHERE id IN ' + E).catch(() => {});
  }
  // 测试站点配置
  await qa('DELETE FROM zhao_site_configs WHERE site_name LIKE $1', [SITENM + '%']);
}

// 断言列表 data 是否含/不含指定 documentId
function ids(list) { return Array.isArray(list) ? list.map((x) => x && x.documentId) : []; }

(async () => {
  // ---------- 0. admin 登录 ----------
  let r = await req('POST', '/api/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  const adminToken = r.data && (r.data.jwt || r.data.token || (r.data.data && r.data.data.token));
  ok('admin 登录', !!adminToken, `status=${r.status}`);
  if (!adminToken) { process.exit(1); }

  // 预清理(开头也跑, 幂等)
  try { await cleanup(); } catch (e) { console.error('预清理异常:', e.message); }

  // ---------- 1. 造测试站点(roleGate 开) ----------
  const site = await qa(
    `INSERT INTO zhao_site_configs (document_id, site_name, domain, feature_flags, channel_usage, created_at, updated_at)
     VALUES ($1,$2,$3,$4::jsonb,'site_cross_user',now(),now()) RETURNING id, document_id`,
    [crypto.randomUUID(), SITENM + Date.now(), DOMAIN, featureFlagsJson(true)]
  );
  const siteDocId = site[0].document_id;
  ok('造测试站点(roleGate=true, exam/activity=true)', !!site[0].id, `siteDocId=${siteDocId} domain=${DOMAIN}`);

  // ---------- 2. 公开配置: featureFlags + moduleGrantedForCurrentTenant ----------
  r = await req('GET', pub('/api/zhao-common/v1/public/config'));
  const cfg = r.data && r.data.data;
  ok('公开配置 200', r.status === 200 && !!cfg, `status=${r.status}`);
  ok('featureFlags 含 exam=true', cfg && cfg.featureFlags && cfg.featureFlags.exam === true, `exam=${cfg && cfg.featureFlags && cfg.featureFlags.exam}`);
  ok('featureFlags 含 activity=true', cfg && cfg.featureFlags && cfg.featureFlags.activity === true, `activity=${cfg && cfg.featureFlags && cfg.featureFlags.activity}`);
  ok('featureFlags 含 roleGate=true(随站点配置)', cfg && cfg.featureFlags && cfg.featureFlags.roleGate === true, `roleGate=${cfg && cfg.featureFlags && cfg.featureFlags.roleGate}`);
  const mGrant = cfg && cfg.moduleGrantedForCurrentTenant;
  ok('moduleGrantedForCurrentTenant 为非空对象且值全为 boolean',
    !!mGrant && typeof mGrant === 'object' && !Array.isArray(mGrant) && Object.keys(mGrant).length > 0
      && Object.values(mGrant).every((v) => typeof v === 'boolean'),
    `keys=${Object.keys(mGrant || {}).length}`);

  // ---------- 3. 造受限/开放 课程、活动、考试 ----------
  // 课程(admin create + 自动 publish)
  // 注: course.admin create 直接返回对象(非包裹), documentId 在顶层
  let rc = await req('POST', '/api/zhao-course/v1/admin/courses', {
    title: PREFIX + 'course_restricted_' + Date.now(), channelScope: 'all', status: 'published', visibleToRoles: [AUTHED_ROLE],
  }, adminToken);
  const courseRDoc = (rc.data && rc.data.documentId) || null;
  rc = await req('POST', '/api/zhao-course/v1/admin/courses', {
    title: PREFIX + 'course_open_' + Date.now(), channelScope: 'all', status: 'published', visibleToRoles: null,
  }, adminToken);
  const courseODoc = (rc.data && rc.data.documentId) || null;

  // 活动
  let ra = await req('POST', '/api/zhao-point/v1/admin/adm/activities', {
    title: PREFIX + 'act_restricted_' + Date.now(), channelScope: 'all', status: 'signup_open', visibleToRoles: [AUTHED_ROLE],
  }, adminToken);
  const actRDoc = (ra.data && ra.data.data && ra.data.data.documentId) || null;
  ra = await req('POST', '/api/zhao-point/v1/admin/adm/activities', {
    title: PREFIX + 'act_open_' + Date.now(), channelScope: 'all', status: 'signup_open', visibleToRoles: null,
  }, adminToken);
  const actODoc = (ra.data && ra.data.data && ra.data.data.documentId) || null;

  // 考试(无 D&P, 提交即可)
  let re = await req('POST', '/api/zhao-quiz/v1/admin/quiz-exams', {
    title: PREFIX + 'exam_restricted_' + Date.now(), visibleToRoles: [AUTHED_ROLE],
  }, adminToken);
  const examRDoc = (re.data && re.data.data && re.data.data.documentId) || null;
  re = await req('POST', '/api/zhao-quiz/v1/admin/quiz-exams', {
    title: PREFIX + 'exam_open_' + Date.now(), visibleToRoles: null,
  }, adminToken);
  const examODoc = (re.data && re.data.data && re.data.data.documentId) || null;

  ok('造受限课程(R)/开放课程(O) + 受限活动(R)/开放活动(O) + 受限考试(R)/开放考试(O)',
    !!courseRDoc && !!courseODoc && !!actRDoc && !!actODoc && !!examRDoc && !!examODoc,
    `cR=${courseRDoc} cO=${courseODoc} aR=${actRDoc} aO=${actODoc} eR=${examRDoc} eO=${examODoc}`);

  // ---------- 3.1 游客 · roleGate=ON ----------
  r = await req('GET', pub('/api/zhao-course/v1/courses'));
  const cList = r.data && r.data.data;
  ok('游客·课程列表 200', r.status === 200 && Array.isArray(cList), `status=${r.status}`);
  ok('游客·受限课程不可见(roleGate=on)', Array.isArray(cList) && !ids(cList).includes(courseRDoc), ids(cList).join(','));
  ok('游客·开放课程可见', Array.isArray(cList) && ids(cList).includes(courseODoc), '');

  r = await req('GET', pub('/api/zhao-point/v1/activities'));
  const aList = r.data && r.data.data;
  ok('游客·活动列表 200', r.status === 200 && Array.isArray(aList), `status=${r.status}`);
  ok('游客·受限活动不可见(roleGate=on)', Array.isArray(aList) && !ids(aList).includes(actRDoc), ids(aList).join(','));
  ok('游客·开放活动可见', Array.isArray(aList) && ids(aList).includes(actODoc), '');

  r = await req('GET', pub('/api/zhao-quiz/v1/quiz-exams'));
  const eList = r.data && r.data.data;
  ok('游客·考试列表 200', r.status === 200 && Array.isArray(eList), `status=${r.status}`);
  ok('游客·受限考试不可见(roleGate=on)', Array.isArray(eList) && !ids(eList).includes(examRDoc), ids(eList).join(','));
  ok('游客·开放考试可见', Array.isArray(eList) && ids(eList).includes(examODoc), '');

  // 详情: 受限考试/课程 游客 404 或 403(角色的数据未返回)
  // (findOne 对受限项: 课程 candidates 中不含 → 404; 这里仅软断言不掐死, 保证列表语义正确即可)
  r = await req('GET', pub('/api/zhao-course/v1/courses/' + courseRDoc));
  ok('游客·受限课程详情被拒(403/404)', r.status === 403 || r.status === 404, `status=${r.status} ${r.data && r.data.error}`);

  // ---------- 3.2 造测试用户 ----------
  const ts = Date.now();
  const mkUser = async (suffix, roles) => {
    const uName = UPF + suffix + '_' + ts;
    const uEmail = uName + '@rga.vip';
    const up = await qa(
      `INSERT INTO up_users (document_id, username, email, password, provider, confirmed, blocked, zhao_roles, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'local',true,false,$5::jsonb,now(),now()) RETURNING id`,
      [crypto.randomUUID(), uName, uEmail, bcrypt.hashSync(PWD, 10), JSON.stringify(roles)]
    );
    const id = up[0].id;
    const lg = await req('POST', '/api/auth/local', { identifier: uName, password: PWD });
    const token = lg.data && (lg.data.jwt || lg.data.token);
    return { id, token, uName };
  };
  const uPlain = await mkUser('plain', ['user']);
  const uInstr = await mkUser('instr', [AUTHED_ROLE]);
  ok('造登录用户(普通=user / 授权=instructor)并登录', !!uPlain.token && !!uInstr.token, `plain=${uPlain.id} instr=${uInstr.id}`);

  // ---------- 3.3 登录用户 · roleGate=ON(课程/考试公开列表可解析 token) ----------
  // 普通用户
  r = await req('GET', pub('/api/zhao-course/v1/courses'), null, uPlain.token);
  const cp = r.data && r.data.data;
  ok('普通用户·受限课程不可见(roles=[user])', r.status === 200 && Array.isArray(cp) && !ids(cp).includes(courseRDoc), '');
  ok('普通用户·开放课程可见', Array.isArray(cp) && ids(cp).includes(courseODoc), '');
  r = await req('GET', pub('/api/zhao-quiz/v1/quiz-exams'), null, uPlain.token);
  const ep = r.data && r.data.data;
  ok('普通用户·受限考试不可见(roles=[user])', r.status === 200 && Array.isArray(ep) && !ids(ep).includes(examRDoc), '');
  r = await req('GET', pub('/api/zhao-course/v1/courses/' + courseRDoc), null, uPlain.token);
  ok('普通用户·受限课程详情被拒(403/404)', r.status === 403 || r.status === 404, `status=${r.status} ${r.data && r.data.error}`);

  // 授权用户
  r = await req('GET', pub('/api/zhao-course/v1/courses'), null, uInstr.token);
  const ci = r.data && r.data.data;
  ok('授权用户·受限课程可见(roles=[instructor])', r.status === 200 && Array.isArray(ci) && ids(ci).includes(courseRDoc), '');
  r = await req('GET', pub('/api/zhao-course/v1/courses/' + courseRDoc), null, uInstr.token);
  ok('授权用户·受限课程详情 200', r.status === 200 && (r.data && r.data.data), `status=${r.status}`);
  r = await req('GET', pub('/api/zhao-quiz/v1/quiz-exams'), null, uInstr.token);
  const ei = r.data && r.data.data;
  ok('授权用户·受限考试可见(roles=[instructor])', r.status === 200 && Array.isArray(ei) && ids(ei).includes(examRDoc), '');

  // ---------- 4. roleGate=OFF → 受限项对所有人可见 ----------
  await qa(`UPDATE zhao_site_configs SET feature_flags=$1::jsonb, updated_at=now() WHERE document_id=$2`,
    [featureFlagsJson(false), siteDocId]);
  r = await req('GET', pub('/api/zhao-common/v1/public/config'));
  const cfg2 = r.data && r.data.data;
  ok('配置联动: roleGate=off 后 featureFlags.roleGate=false', cfg2 && cfg2.featureFlags && cfg2.featureFlags.roleGate === false,
    `roleGate=${cfg2 && cfg2.featureFlags && cfg2.featureFlags.roleGate}`);

  // 游客
  r = await req('GET', pub('/api/zhao-course/v1/courses'));
  const cOff = r.data && r.data.data;
  ok('游客·受限课程可见(roleGate=off)', r.status === 200 && Array.isArray(cOff) && ids(cOff).includes(courseRDoc), '');
  r = await req('GET', pub('/api/zhao-point/v1/activities'));
  const aOff = r.data && r.data.data;
  ok('游客·受限活动可见(roleGate=off)', r.status === 200 && Array.isArray(aOff) && ids(aOff).includes(actRDoc), '');
  r = await req('GET', pub('/api/zhao-quiz/v1/quiz-exams'));
  const eOff = r.data && r.data.data;
  ok('游客·受限考试可见(roleGate=off)', r.status === 200 && Array.isArray(eOff) && ids(eOff).includes(examRDoc), '');
  // 普通登录用户也可见
  r = await req('GET', pub('/api/zhao-course/v1/courses'), null, uPlain.token);
  const cpOff = r.data && r.data.data;
  ok('普通用户·受限课程可见(roleGate=off)', r.status === 200 && Array.isArray(cpOff) && ids(cpOff).includes(courseRDoc), '');

  // ---------- 5. 收尾清理 + 零残留断言 ----------
  await cleanup();
  const res = (await qa(`SELECT
      (SELECT count(*)::int FROM zhao_courses WHERE title LIKE $1) c,
      (SELECT count(*)::int FROM activities WHERE title LIKE $1) a,
      (SELECT count(*)::int FROM zhao_quiz_exams WHERE title LIKE $1) e,
      (SELECT count(*)::int FROM zhao_site_configs WHERE site_name LIKE $2) s,
      (SELECT count(*)::int FROM up_users WHERE username LIKE $3) u,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE $3) su`,
    [PREFIX + '%', SITENM + '%', UPF + '%']))[0];
  ok('清理零残留(课程/活动/考试/站点/用户/sso 均 0)',
    res.c === 0 && res.a === 0 && res.e === 0 && res.s === 0 && res.u === 0 && res.su === 0,
    `c=${res.c} a=${res.a} e=${res.e} s=${res.s} u=${res.u} su=${res.su}`);

  console.log(`\n=== 租户 featureFlags + roleGate 强角色门控 验收: PASS=${PASS} FAIL=${FAIL} ===`);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error('脚本异常:', e && e.stack || e); process.exit(1); });