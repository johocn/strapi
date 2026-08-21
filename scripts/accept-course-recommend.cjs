/* 课程续学推荐 accept
 * 用法: cd e:\code\basic && node scripts/accept-course-recommend.cjs
 * 依赖: 本地 dev 1337 运行中(127.0.0.1:1337)。zhao-course 插件已 npm run build 重建 dist。
 *
 * 覆盖:
 *   - 公开路由 /courses/:documentId/related      （engine.relatedFor）
 *   - 登录路由 /my/course-suggestions            （engine.suggestionsFor）
 *   - 打分规则: 同分类 level 递进(+100) + 共享 keyword(+5) 使 foundation 置顶; 序列续学(同 sequenceTag + gap=1 + enforceSequence=+300, sequenceNext=true)
 *   - 已报名课程排除
 *   - 字段契约(documentId/title/category/level/price/isFree/sequenceNext/score/seedId)
 *   - 未登录 suggestions 401/403; 错误 documentId related 返回空数组
 *
 * schema 要点(需核对真实库):
 *   - 课程表 zhao_courses; 分类 manyToOne 经 zhao_courses_category_lnk
 *   - sequenceTag manyToOne 经 zhao_courses_sequence_tag_lnk
 *   - 报名表 zhao_course_enrollments(user 经 zhao_course_enrollments_user_lnk, course 经 _course_lnk)
 *   - 学习记录 zhao_course_progresses(user/course 经 lnk, 动态解析 FK 列名)
 *   - C 端用户 token: zhao-auth 复用 users-permissions jwtSecret, 故用 /api/auth/local 登录 up_users 即可拿到
 *     能被 is-authenticated(zhao-auth secret) 校验通过的 token(user.id=up_users.id)
 */
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const pg = require('pg');
const bcrypt = require(path.join(__dirname, '..', 'node_modules', 'bcryptjs'));

const BASE = 'http://127.0.0.1:1337';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PREFIX = 'qcr_';          // 课程/分类/标签标题前缀
const UPF = 'qcr_user_';        // 测试用户前缀
const PWD = 'RecCourse123';
const MARK = '推荐验收:';

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

// 动态解析 progress 表 user/course FK 列名 + lnk 表显式分配自增 id(规避序列落后于存量行)
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
  const ups = (await qa('SELECT id FROM up_users WHERE username LIKE $1', [UPF + '%'])).map((r) => r.id);
  if (ups.length) {
    const U = subIds(ups);
    const pIds = (await qa(`SELECT ${PROG_USER_FK} AS pid FROM zhao_course_progresses_user_lnk WHERE user_id IN ${U}`)).map((r) => r.pid);
    await qa(`DELETE FROM zhao_course_progresses_user_lnk WHERE user_id IN ${U}`);
    if (pIds.length) {
      const S = subIds(pIds);
      await qa(`DELETE FROM zhao_course_progresses_course_lnk WHERE ${PROG_COURSE_FK} IN ${S}`);
      await qa(`DELETE FROM zhao_course_progresses WHERE id IN ${S}`);
    }
    const enIds = (await qa(`SELECT course_enrollment_id AS id FROM zhao_course_enrollments_user_lnk WHERE user_id IN ${U}`)).map((r) => r.id);
    await qa(`DELETE FROM zhao_course_enrollments_user_lnk WHERE user_id IN ${U}`);
    if (enIds.length) {
      const S = subIds(enIds);
      await qa(`DELETE FROM zhao_course_enrollments_course_lnk WHERE course_enrollment_id IN ${S}`);
      await qa(`DELETE FROM zhao_course_enrollments WHERE id IN ${S}`);
    }
    await qa('DELETE FROM up_users WHERE id IN ' + U);
  }
  await qa('DELETE FROM sso_users WHERE username LIKE $1', [UPF + '%']);

  const courses = (await qa('SELECT id FROM zhao_courses WHERE title LIKE $1', [PREFIX + '%'])).map((r) => r.id);
  if (courses.length) {
    const C = subIds(courses);
    await qa(`DELETE FROM zhao_courses_category_lnk WHERE course_id IN ${C}`);
    await qa(`DELETE FROM zhao_courses_sequence_tag_lnk WHERE course_id IN ${C}`);
    await qa(`DELETE FROM zhao_courses_tags_lnk WHERE course_id IN ${C}`);
    await qa(`DELETE FROM zhao_courses WHERE id IN ${C}`);
  }
  await qa('DELETE FROM zhao_course_categories WHERE name LIKE $1', [MARK + '%']);
  await qa('DELETE FROM zhao_tags WHERE name LIKE $1', [PREFIX + '%']);
}

async function mkCategory(name) {
  const r = await qa("INSERT INTO zhao_course_categories (document_id,name,created_at,updated_at) VALUES ($1,$2,now(),now()) RETURNING id", [crypto.randomUUID(), name]);
  return r[0].id;
}

let ORDER = 1;
async function mkCourse({ title, catId, level, keywords = null, studentCount = 0, seqTagId = null, sequenceNumber = 0, enforceSequence = false }) {
  const r = await qa(
    `INSERT INTO zhao_courses (document_id,title,status,level,course_type,is_free,is_paid,price,student_count,keywords,sequence_number,enforce_sequence,created_at,updated_at)
     VALUES ($1,$2,'published',$3,'free',true,false,0,$4,$5,$6,$7,now(),now()) RETURNING id, document_id`,
    [crypto.randomUUID(), title, level, studentCount, keywords ? JSON.stringify(keywords) : null, sequenceNumber, enforceSequence]
  );
  const id = r[0].id;
  if (catId) await qa('INSERT INTO zhao_courses_category_lnk (course_id,course_category_id,course_ord) VALUES ($1,$2,$3)', [id, catId, ORDER++]);
  if (seqTagId) await qa('INSERT INTO zhao_courses_sequence_tag_lnk (course_id,tag_id,course_ord) VALUES ($1,$2,0)', [id, seqTagId]);
  return r[0];
}

async function mkProgress(userId, courseId, progress) {
  const r = await qa(
    "INSERT INTO zhao_course_progresses (document_id,progress,is_completed,total_lessons,created_at,updated_at) VALUES ($1,$2,false,10,now(),now()) RETURNING id",
    [crypto.randomUUID(), progress]
  );
  const id = r[0].id;
  await qa('INSERT INTO zhao_course_progresses_user_lnk (id,' + PROG_USER_FK + ',user_id) VALUES ($1,$2,$3)', [nextId('zhao_course_progresses_user_lnk'), id, userId]);
  await qa('INSERT INTO zhao_course_progresses_course_lnk (id,' + PROG_COURSE_FK + ',course_id) VALUES ($1,$2,$3)', [nextId('zhao_course_progresses_course_lnk'), id, courseId]);
  return id;
}

(async () => {
  await resolveProgressFk();
  await cleanup();

  // ---------- 0. admin 登录(仅用于连带校验 C 端 auth) ----------
  let r = await req('POST', '/api/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  ok('admin 登录', !!r.data && !!(r.data.jwt || r.data.token), `status=${r.status}`);
  if (!r.data || !(r.data.jwt || r.data.token)) { console.error('admin 登录失败，终止'); process.exit(1); }

  const ts = Date.now();
  const catAName = MARK + 'AI进阶';
  const catBName = MARK + 'B财务';

  // ---------- 1. 造种子 ----------
  const catA = await mkCategory(catAName);
  const catB = await mkCategory(catBName);
  // 序列标签 T
  const tagT = await qa("INSERT INTO zhao_tags (document_id,name,created_at,updated_at) VALUES ($1,$2,now(),now()) RETURNING id", [crypto.randomUUID(), PREFIX + 'seqtag']);
  const tagTId = tagT[0].id;

  // A 分类课程: intro(seed, 共享 kw) / foundation(期望 related 首条: level 递进+共享kw) / advanced
  const cAI = await mkCourse({ title: PREFIX + 'cAI_intro', catId: catA, level: 'introductory', keywords: ['aiSeed'], studentCount: 999 });
  const cAF = await mkCourse({ title: PREFIX + 'cAF_foundation', catId: catA, level: 'foundation', keywords: ['aiSeed'], studentCount: 800 });
  const cAA = await mkCourse({ title: PREFIX + 'cAA_advanced', catId: catA, level: 'advanced', keywords: [], studentCount: 600 });
  // B 分类(不同 cat, 低热度, 期望不优先)
  const cB = await mkCourse({ title: PREFIX + 'cB_other', catId: catB, level: 'foundation', keywords: [], studentCount: 5 });
  // 序列课程: seq1 / seq2 同 tag T, enforceSequence, gap=1
  const seq1 = await mkCourse({ title: PREFIX + 'seq1', catId: catA, level: 'foundation', seqTagId: tagTId, sequenceNumber: 1, enforceSequence: true, studentCount: 400 });
  const seq2 = await mkCourse({ title: PREFIX + 'seq2', catId: catA, level: 'foundation', seqTagId: tagTId, sequenceNumber: 2, enforceSequence: true, studentCount: 300 });
  ok('造分类A/B + 6门已发布课程 + 序列标签T', !!catA && !!catB && !!tagTId && !!cAI.id && !!cAF.id && !!cAA.id && !!cB.id && !!seq1.id && !!seq2.id,
    `AI=${cAI.id} AF=${cAF.id} AA=${cAA.id} B=${cB.id} seq1=${seq1.id} seq2=${seq2.id}`);

  // 测试用户(带密码, 走 /api/auth/local 得 token)
  const uName = UPF + ts;
  const uEmail = uName + '@rec.vip';
  const up = await qa(
    'INSERT INTO up_users (document_id,username,email,password,provider,confirmed,blocked,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,true,false,now(),now()) RETURNING id',
    [crypto.randomUUID(), uName, uEmail, bcrypt.hashSync(PWD, 10), 'local']
  );
  const upId = up[0].id;
  // 报名 cAI(期望被排除) + 学习记录 cAI(progress 10) 与 seq1(progress 50)(期望种子, 推导 seq2=sequenceNext)
  const en = await qa(
    "INSERT INTO zhao_course_enrollments (document_id,status,enroll_type,points_spent,created_at,updated_at) VALUES ($1,'enrolled','free',0,now(),now()) RETURNING id",
    [crypto.randomUUID()]
  );
  await qa('INSERT INTO zhao_course_enrollments_user_lnk (course_enrollment_id,user_id) VALUES ($1,$2)', [en[0].id, upId]);
  await qa('INSERT INTO zhao_course_enrollments_course_lnk (course_enrollment_id,course_id) VALUES ($1,$2)', [en[0].id, cAI.id]);
  const pgAI = await mkProgress(upId, cAI.id, 10);
  const pgSeq1 = await mkProgress(upId, seq1.id, 50);
  ok('造 up 用户(报名cAI) + 学习记录(cAI 10%, seq1 50%)', !!upId && !!en[0].id && !!pgAI && !!pgSeq1, `up=${upId}`);

  // C 端用户登录 token
  r = await req('POST', '/api/auth/local', { identifier: uName, password: PWD });
  const userToken = r.data && (r.data.jwt || r.data.token);
  ok('up 用户登录(token=zhao-auth 可解析)', !!userToken, `status=${r.status}`);

  // ---------- 2. related (公开) ----------
  r = await req('GET', '/api/zhao-course/v1/courses/' + cAI.document_id + '/related?limit=6');
  const rel = r.data && r.data.data;
  const relFirst = Array.isArray(rel) && rel[0] ? rel[0] : null;
  ok('related 200 且 data 数组非空', r.status === 200 && Array.isArray(rel) && rel.length > 0, `status=${r.status} n=${Array.isArray(rel) ? rel.length : -1}`);
  ok('related 首条 = cAF(同分类 level 递进 + 共享 keyword 置顶)', relFirst && relFirst.documentId === cAF.document_id,
    `got=${relFirst && relFirst.title}`);
  ok('related 首条 category 正确(分类A)', relFirst && relFirst.category === catAName, `cat=${relFirst && relFirst.category}`);
  ok('related 首条 level = foundation', relFirst && relFirst.level === 'foundation', `level=${relFirst && relFirst.level}`);
  const relTitles = (Array.isArray(rel) ? rel : []).map((x) => x.documentId);
  ok('related 不含 cB(其他分类低热度不优先)', !relTitles.includes(cB.document_id), JSON.stringify(relTitles.slice(0, 4)));

  // 错误 documentId -> 空数组
  r = await req('GET', '/api/zhao-course/v1/courses/nonexistent-doc/related');
  ok('related 未知课程返回空数组', r.status === 200 && Array.isArray(r.data && r.data.data) && r.data.data.length === 0, `status=${r.status}`);

  // ---------- 3. suggestions (登录) ----------
  r = await req('GET', '/api/zhao-course/v1/my/course-suggestions?limit=6', null, userToken);
  const sug = r.data && r.data.data;
  const sugFirst = Array.isArray(sug) && sug[0] ? sug[0] : null;
  ok('suggestions 200 且非空', r.status === 200 && Array.isArray(sug) && sug.length > 0, `status=${r.status} n=${Array.isArray(sug) ? sug.length : -1}`);
  ok('suggestions 首条 = seq2(序列续学 sequenceNext=true 置顶)', sugFirst && sugFirst.documentId === seq2.document_id && sugFirst.sequenceNext === true,
    `got=${sugFirst && sugFirst.title} seqNext=${sugFirst && sugFirst.sequenceNext}`);
  const sugTitles = (Array.isArray(sug) ? sug : []).map((x) => x.documentId);
  ok('suggestions 排除已报名 cAI', !sugTitles.includes(cAI.document_id), JSON.stringify(sugTitles.slice(0, 4)));

  // ---------- 4. 字段契约 ----------
  const row = sugFirst || relFirst;
  ok('字段契约齐(documentId/title/category/level/price/isFree/sequenceNext/score/seedId)',
    row &&
    ['documentId', 'title', 'category', 'level', 'price', 'isFree', 'sequenceNext', 'score', 'seedId']
      .every((k) => Object.prototype.hasOwnProperty.call(row, k)),
    row ? Object.keys(row).join(',') : '');

  // 未登录 -> 401/403
  r = await req('GET', '/api/zhao-course/v1/my/course-suggestions');
  ok('suggestions 未登录 401/403', r.status === 401 || r.status === 403, `status=${r.status}`);

  // ---------- 5. 清理零残留 ----------
  await cleanup();
  const rc = (await qa(`SELECT
      (SELECT count(*)::int FROM zhao_courses WHERE title LIKE $1) c,
      (SELECT count(*)::int FROM zhao_course_categories WHERE name LIKE $2) cc,
      (SELECT count(*)::int FROM zhao_tags WHERE name LIKE $3) t,
      (SELECT count(*)::int FROM up_users WHERE username LIKE $4) uu,
      (SELECT count(*)::int FROM sso_users WHERE username LIKE $5) su,
      (SELECT count(*)::int FROM zhao_course_progresses WHERE id IN (SELECT ${PROG_USER_FK} FROM zhao_course_progresses_user_lnk WHERE user_id IN (SELECT id FROM up_users WHERE username LIKE $6))) p,
      (SELECT count(*)::int FROM zhao_course_enrollments WHERE id IN (SELECT course_enrollment_id FROM zhao_course_enrollments_user_lnk WHERE user_id IN (SELECT id FROM up_users WHERE username LIKE $7))) e`,
    [PREFIX + '%', MARK + '%', PREFIX + '%', UPF + '%', UPF + '%', UPF + '%', UPF + '%']))[0];
  ok('清理零残留(course/category/tag/up_user/sso_user/progress/enrollment 均 0)',
    rc.c === 0 && rc.cc === 0 && rc.t === 0 && rc.uu === 0 && rc.su === 0 && rc.p === 0 && rc.e === 0,
    `c=${rc.c} cc=${rc.cc} t=${rc.t} uu=${rc.uu} su=${rc.su} p=${rc.p} e=${rc.e}`);

  console.log(`\n=== 课程续学推荐 验收: PASS=${PASS} FAIL=${FAIL} ===`);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error('脚本异常:', e && e.stack || e); process.exit(1); });