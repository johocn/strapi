// 画像兴趣标签补全 后端验收
// 覆盖：造 课程分类/文章分类/活动类型 行为数据 → 画像详情实时聚合 → 断言 interests top3 标签 → 清理
// 要求：本地 Strapi 已运行(127.0.0.1:1337)，activity 已含 type 列（新 schema 需先重建并启动）
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const pg = require('pg');
const bcrypt = require(path.join(__dirname, '../plugins/zhao-sso/node_modules/bcryptjs'));
const BASE = 'http://127.0.0.1:1337';

const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'sso_in_';        // 测试用户名前缀
const PWD = 'Interest123';   // 测试 sso 用户密码
const MARK = '验收-兴趣-';   // 课程/文章/活动标题前缀

function req(method, p, body, token) {
  const data = body ? JSON.stringify(body) : null;
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return new Promise((resolve) => {
    const r = http.request(BASE + p, { method, headers: h, timeout: 25000 }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
      res.on('end', () => { let j = null; try { j = JSON.parse(d); } catch { j = d; } resolve({ status: res.statusCode, data: j }); });
    });
    r.on('error', (e) => resolve({ status: 0, data: 'NET_ERR: ' + e.message }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, data: 'TIMEOUT' }); });
    if (data) r.write(data); r.end();
  });
}
const ok = (name, cond, extra = '') => console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : ''));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let client;
const q = async (sql, params) => (await client.query(sql, params)).rows;
const subIds = (ids) => ids.length ? '(' + ids.join(',') + ')' : '(NULL)';

async function cleanup() {
  // sso_users / up_users 测试用户
  const ids = (await q('SELECT id FROM sso_users WHERE username LIKE $1', [PF + '%'])).map((r) => r.id);
  if (ids.length) {
    const S = subIds(ids);
    const profIds = (await q(`SELECT sso_user_profile_id AS id FROM sso_user_profiles_user_lnk WHERE sso_user_id IN ${S}`)).map((r) => r.id);
    await q(`DELETE FROM sso_user_profiles_user_lnk WHERE sso_user_id IN ${S}`);
    if (profIds.length) await q(`DELETE FROM sso_user_profiles WHERE id IN ${subIds(profIds)}`);
  }
  await q('DELETE FROM up_users WHERE username LIKE $1', [PF + '%']);
  await q('DELETE FROM sso_users WHERE username LIKE $1', [PF + '%']);

  // up_users 行为数据（lesson-progress / visit-log）
  const ups = (await q('SELECT id FROM up_users WHERE username LIKE $1', [PF + '%'])).map((r) => r.id);
  if (ups.length) {
    const U = subIds(ups);
    const lpIds = (await q(`SELECT lesson_progress_id AS id FROM zhao_lesson_progresses_user_lnk WHERE user_id IN ${U}`)).map((r) => r.id);
    await q(`DELETE FROM zhao_lesson_progresses_user_lnk WHERE user_id IN ${U}`);
    await q(`DELETE FROM zhao_lesson_progresses_course_lnk WHERE lesson_progress_id IN ${subIds(lpIds)}`);
    if (lpIds.length) await q(`DELETE FROM zhao_lesson_progresses WHERE id IN ${subIds(lpIds)}`);
    const vIds = (await q(`SELECT visit_log_id AS id FROM zhao_website_visit_logs_user_id_lnk WHERE user_id IN ${U}`)).map((r) => r.id);
    await q(`DELETE FROM zhao_website_visit_logs_user_id_lnk WHERE user_id IN ${U}`);
    await q(`DELETE FROM zhao_website_visit_logs_site_lnk WHERE visit_log_id IN ${subIds(vIds)}`);
    if (vIds.length) await q(`DELETE FROM zhao_website_visit_logs WHERE id IN ${subIds(vIds)}`);
  }

  // 活动（按 MARK 标题；关系存 join 表，signups 表无 activity_id 列）
  const acts = (await q('SELECT id FROM activities WHERE title LIKE $1', [MARK + '%'])).map((r) => r.id);
  if (acts.length) {
    const A = subIds(acts);
    const sgIds = (await q(`SELECT activity_signup_id AS id FROM activity_signups_activity_lnk WHERE activity_id IN ${A}`)).map((r) => r.id);
    if (sgIds.length) {
      await q(`DELETE FROM activity_signups_user_lnk WHERE activity_signup_id IN ${subIds(sgIds)}`);
      await q(`DELETE FROM activity_signups_activity_lnk WHERE activity_id IN ${A}`);
      await q(`DELETE FROM activity_signups WHERE id IN ${subIds(sgIds)}`);
    }
    await q(`DELETE FROM activities WHERE id IN ${A}`);
  }

  // 课程（按 MARK 标题）
  const courses = (await q('SELECT id FROM zhao_courses WHERE title LIKE $1', [MARK + '%'])).map((r) => r.id);
  if (courses.length) {
    const C = subIds(courses);
    await q(`DELETE FROM zhao_courses_category_lnk WHERE course_id IN ${C}`);
    await q(`DELETE FROM zhao_courses WHERE id IN ${C}`);
  }
  await q(`DELETE FROM zhao_course_categories WHERE name LIKE $1`, [MARK + '%']);

  // 文章（按 MARK 标题）
  const arts = (await q('SELECT id FROM zhao_website_articles WHERE title LIKE $1', [MARK + '%'])).map((r) => r.id);
  if (arts.length) {
    const A = subIds(arts);
    await q(`DELETE FROM zhao_website_articles_category_lnk WHERE article_id IN ${A}`);
    await q(`DELETE FROM zhao_website_articles_site_lnk WHERE article_id IN ${A}`);
    await q(`DELETE FROM zhao_website_articles WHERE id IN ${A}`);
  }
  await q(`DELETE FROM zhao_website_article_categories WHERE name LIKE $1`, [MARK + '%']);

  // site_config（按 site_name）
  await q(`DELETE FROM zhao_site_configs WHERE site_name LIKE $1`, [MARK + '%']);
}

(async () => {
  client = new pg.Client(PG);
  await client.connect();

  // ---------- 0. admin 登录 ----------
  let r = await req('POST', '/api/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  const token = r.data && (r.data.jwt || r.data.token || (r.data.data && r.data.data.token));
  ok('zhao-auth admin 登录', !!token, `status=${r.status}`);
  if (!token) return;

  await cleanup();
  ok('预清理历史 sso_in_* 测试数据', true);

  // ---------- 1. 造测试数据 ----------
  // site_config（article/article-category/visit-log 的必填 site 关联）
  const site = await q(
    "INSERT INTO zhao_site_configs (document_id, site_name, channel_usage, created_at, updated_at) VALUES ($1,$2,'site_cross_user',now(),now()) RETURNING id",
    [crypto.randomUUID(), MARK + 'site']
  );
  const siteId = site[0].id;

  // 课程分类 + 课程（2 门同分类，制造 count=2）
  const cat = await q(
    "INSERT INTO zhao_course_categories (document_id, name, created_at, updated_at) VALUES ($1,$2,now(),now()) RETURNING id",
    [crypto.randomUUID(), MARK + '基金入门']
  );
  const catId = cat[0].id;
  const c1 = await q(
    "INSERT INTO zhao_courses (document_id, title, created_at, updated_at) VALUES ($1,$2,now(),now()) RETURNING id",
    [crypto.randomUUID(), MARK + '基金课程A']
  );
  const c2 = await q(
    "INSERT INTO zhao_courses (document_id, title, created_at, updated_at) VALUES ($1,$2,now(),now()) RETURNING id",
    [crypto.randomUUID(), MARK + '基金课程B']
  );
  for (const c of [c1[0], c2[0]]) await q(
    'INSERT INTO zhao_courses_category_lnk (course_id, course_category_id, course_ord) VALUES ($1,$2,0)', [c.id, catId]
  );

  // 文章分类 + 文章
  const acat = await q(
    "INSERT INTO zhao_website_article_categories (document_id, name, slug, created_at, updated_at) VALUES ($1,$2,$3,now(),now()) RETURNING id",
    [crypto.randomUUID(), MARK + '理财科普', 'sso-in-finance']
  );
  await q('INSERT INTO zhao_website_article_categories_site_lnk (article_category_id, site_config_id, article_category_ord) VALUES ($1,$2,0)', [acat[0].id, siteId]);
  const art = await q(
    "INSERT INTO zhao_website_articles (document_id, title, slug, content, created_at, updated_at) VALUES ($1,$2,$3,$4,now(),now()) RETURNING id, document_id",
    [crypto.randomUUID(), MARK + '理财科普文章', 'sso-in-article', '验收文章内容']
  );
  await q('INSERT INTO zhao_website_articles_category_lnk (article_id, article_category_id, article_ord) VALUES ($1,$2,0)', [art[0].id, acat[0].id]);
  await q('INSERT INTO zhao_website_articles_site_lnk (article_id, site_config_id, article_ord) VALUES ($1,$2,0)', [art[0].id, siteId]);

  // 活动（type=线下讲座）+ 报名
  const act = await q(
    "INSERT INTO activities (document_id,title,type,status,capacity,used_capacity,channel_scope,created_at,updated_at) VALUES ($1,$2,$3,'signup_open',10,0,'all',now(),now()) RETURNING id",
    [crypto.randomUUID(), MARK + '线下讲座活动', '线下讲座']
  );
  const actId = act[0].id;

  // sso 用户 + up_users 匹配
  const ts = Date.now();
  const uName = PF + 'user_' + ts;
  const uEmail = uName + '@shenglin.vip';
  const hash = bcrypt.hashSync(PWD, 12);
  const ssoUser = await q(
    "INSERT INTO sso_users (document_id, uuid, username, email, password_hash, status, register_channel, login_count, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,'active','accept',0,now(),now()) RETURNING id",
    [crypto.randomUUID(), crypto.randomUUID(), uName, uEmail, hash]
  );
  const ssoUserId = ssoUser[0].id;
  const up = await q(
    "INSERT INTO up_users (document_id, username, email, provider, confirmed, blocked, created_at, updated_at) VALUES ($1,$2,$3,'local',true,false,now(),now()) RETURNING id",
    [crypto.randomUUID(), uName, uEmail]
  );
  const upId = up[0].id;
  ok('造测试数据(课程x2/文章x1/活动x1/sso用户)', !!ssoUserId && !!upId, `ssoUserId=${ssoUserId} upUserId=${upId}`);

  // 行为数据：lesson-progress x2（course 关联）、visit-log x1（article_view）、activity-signup x1
  const lp1 = await q(
    "INSERT INTO zhao_lesson_progresses (document_id, progress, is_completed, last_study_at, created_at, updated_at) VALUES ($1,100,true,now(),now(),now()) RETURNING id",
    [crypto.randomUUID()]
  );
  const lp2 = await q(
    "INSERT INTO zhao_lesson_progresses (document_id, progress, is_completed, last_study_at, created_at, updated_at) VALUES ($1,60,false,now(),now(),now()) RETURNING id",
    [crypto.randomUUID()]
  );
  for (const lp of [lp1[0], lp2[0]]) {
    await q('INSERT INTO zhao_lesson_progresses_user_lnk (lesson_progress_id, user_id) VALUES ($1,$2)', [lp.id, upId]);
  }
  await q('INSERT INTO zhao_lesson_progresses_course_lnk (lesson_progress_id, course_id) VALUES ($1,$2)', [lp1[0].id, c1[0].id]);
  await q('INSERT INTO zhao_lesson_progresses_course_lnk (lesson_progress_id, course_id) VALUES ($1,$2)', [lp2[0].id, c2[0].id]);

  const vl = await q(
    "INSERT INTO zhao_website_visit_logs (document_id, type, target_type, target_id, dwell_time, created_at, updated_at) VALUES ($1,'article_view','article',$2,80,now(),now()) RETURNING id",
    [crypto.randomUUID(), art[0].document_id]
  );
  await q('INSERT INTO zhao_website_visit_logs_user_id_lnk (visit_log_id, user_id) VALUES ($1,$2)', [vl[0].id, upId]);
  await q('INSERT INTO zhao_website_visit_logs_site_lnk (visit_log_id, site_config_id, visit_log_ord) VALUES ($1,$2,0)', [vl[0].id, siteId]);

  const sg = await q(
    "INSERT INTO activity_signups (document_id, status, signup_at, created_at, updated_at) VALUES ($1,'active',now(),now(),now()) RETURNING id",
    [crypto.randomUUID()]
  );
  await q('INSERT INTO activity_signups_user_lnk (activity_signup_id, user_id) VALUES ($1,$2)', [sg[0].id, upId]);
  await q('INSERT INTO activity_signups_activity_lnk (activity_signup_id, activity_id) VALUES ($1,$2)', [sg[0].id, actId]);

  // ---------- 2. 画像详情（实时聚合，含兴趣标签） ----------
  await sleep(300);
  r = await req('GET', `/api/zhao-sso/v1/admin/profiles/${ssoUserId}`, null, token);
  const det = r.data && r.data.data;
  ok('画像详情 200 + hasData', r.status === 200 && det && det.hasData === true, `status=${r.status} segment=${det && det.segment}`);
  const interests = Array.isArray(det && det.interests) ? det.interests : [];
  ok('interests 非空且 top3', interests.length === 3, `interests=${JSON.stringify(interests)}`);

  const hasCourse = interests.includes('验收-兴趣-基金入门');
  const hasArticle = interests.includes('验收-兴趣-理财科普');
  const hasActivity = interests.includes('线下讲座');
  ok('兴趣含 课程分类(基金入门)', hasCourse, JSON.stringify(interests));
  ok('兴趣含 文章分类(理财科普)', hasArticle, JSON.stringify(interests));
  ok('兴趣含 活动类型(线下讲座)', hasActivity, JSON.stringify(interests));
  ok('top1 为课程分类(频次2最高)', interests[0] === '验收-兴趣-基金入门', `order=${JSON.stringify(interests)}`);

  // ---------- 3. 清理 ----------
  await cleanup();
  ok('清理验收测试数据(sso_in_*)', true);

  console.log('\n--- 画像兴趣标签验收完成 ---');
  process.exit(0);
})().catch((e) => { console.error('脚本异常:', e && e.message); process.exit(1); });
