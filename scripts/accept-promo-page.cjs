/* 活动宣传页（Phase A） 验收
 * 用法: cd e:\code\basic && node scripts/accept-promo-page.cjs
 * 覆盖(对齐后端契约 /api/zhao-point/v1/):
 *  1. 公开聚合: admin 创建活动(含 promoModules 合法编排), 匿名 GET /promo/activity/:documentId
 *     → 返回 activity/modules/contact/rewards/signupStatus 五键, modules 为数组且 sort 升序
 *  2. 模块归一化: admin 创建/更新带合法+非法 type('cover','badtype','info')+sort 冲突的 promoModules
 *     → 非法被过滤、sort 冲突去重并升序、raw-pg 存库正确; promoTemplate 非法 400; promoContact 非对象 400
 *  3. 留言闭环: 注册用户 → POST message → 我的留言可见 → admin 回复 → 我的留言 reply+status=replied
 *     → adminListMessages 可按 activity/status 过滤
 *  4. 联系方式合并: 站点 extraConfig.promoContact 存在时(活动未配置)读站点; 活动配置 promoContact 后活动优先
 *  5. 零残留: 删除测试活动与所有测试留言, raw-pg 断言 activities/activity_messages 无残留, 测试用户清理
 * 运行前置: 本地 Strapi develop(127.0.0.1:1337)已运行且 zhao-point 已重编译
 */
const { Client } = require('pg');

const BASE = 'http://127.0.0.1:1337/api';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'app_'; // 测试用户名前缀
const ACT_TITLE_PREFIX = '验收-宣传页-'; // 活动标题前缀
const MSG_MARKER = '[验收宣传页]'; // 留言内容标记

let PASS = 0, FAIL = 0;
const out = [];
const check = (name, cond, detail = '') => {
  if (cond) PASS++; else FAIL++;
  out.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let client;

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let r;
  for (let i = 0; i < 25; i++) {
    try { r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); break; }
    catch (e) { if (i === 24) return { status: 0, json: { netErr: e.message } }; await sleep(600); }
  }
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}
async function waitForAdmin() {
  for (let i = 0; i < 30; i++) {
    const r = await api('POST', '/zhao-auth/v1/login', { body: { identifier: '1117', password: 'a123456' } });
    if (r.status === 200 && r.json?.jwt) return r.json;
    await sleep(800);
  }
  return null;
}
const tokenOf = (j) =>
  (j && (j.jwt || j.access_token || j.token || (j.data && (j.data.jwt || j.data.token || j.data.access_token)))) || null;
async function register(username) {
  const res = await api('POST', '/zhao-auth/v1/register', {
    body: { username, email: `${username}@audit.local`, password: 'a123456', confirmPassword: 'a123456' },
  });
  const j = res.json || {};
  const user = j.user || j.data?.user || j.data || j;
  return { id: user?.id || user?.documentId, documentId: user?.documentId, username, token: tokenOf(j), raw: j };
}
const q = async (sql, params) => (await client.query(sql, params)).rows;

const day = (offsetMin) => {
  const d = new Date(Date.now() + offsetMin * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** 删除指定活动及其宣传页留言(含 lnk) */
async function purgeActivity(actId) {
  const msgIds = await q(`SELECT am.id::int AS id FROM activity_messages am
    JOIN activity_messages_activity_lnk al ON al.activity_message_id = am.id WHERE al.activity_id = $1`, [actId]);
  for (const m of msgIds) {
    await client.query(`DELETE FROM activity_messages_activity_lnk WHERE activity_message_id = $1`, [m.id]);
    await client.query(`DELETE FROM activity_messages_user_lnk WHERE activity_message_id = $1`, [m.id]);
    await client.query(`DELETE FROM activity_messages WHERE id = $1`, [m.id]);
  }
  await client.query(`DELETE FROM activities_belongs_to_series_lnk WHERE activity_id = $1`, [actId]);
  await client.query(`DELETE FROM activities WHERE id = $1`, [actId]);
}
/** 清理标记前缀的残留活动/留言/用户(开头与结尾共用) */
async function purgeResidue() {
  const acts = await q(`SELECT id::int AS id FROM activities WHERE title LIKE $1`, [`${ACT_TITLE_PREFIX}%`]);
  for (const a of acts) await purgeActivity(a.id);
  const msgs = await q(`SELECT id::int AS id FROM activity_messages WHERE content LIKE $1`, [`%${MSG_MARKER}%`]);
  for (const m of msgs) {
    await client.query(`DELETE FROM activity_messages_activity_lnk WHERE activity_message_id = $1`, [m.id]);
    await client.query(`DELETE FROM activity_messages_user_lnk WHERE activity_message_id = $1`, [m.id]);
    await client.query(`DELETE FROM activity_messages WHERE id = $1`, [m.id]);
  }
  await client.query(`DELETE FROM up_users WHERE username LIKE $1`, [`${PF}%`]);
}

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');
  const ts = Date.now();
  const RND = Math.floor(Math.random() * 1e6);
  const nm = (s) => `${PF}${s}_${ts}_${RND}`;
  const mkTitle = (s) => `${ACT_TITLE_PREFIX}${s}`;

  // ---- 清场(开头) ----
  await purgeResidue();

  // ---- admin 登录 ----
  const adminLogin = await waitForAdmin();
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 80));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  const mkAct = (title, cfg) => api('POST', '/zhao-point/v1/admin/adm/activities', {
    token: adminToken, body: { title, description: title, capacity: 100, status: 'signup_open', startTime: day(480), endTime: day(540), ...cfg },
  });

  // ================== 测试 1：公开聚合 ==================
  console.log('\n--- 测试 1：公开聚合(匿名) ---');
  const modulesLegal = [
    { type: 'cover', sort: 1, config: { title: '封面' } },
    { type: 'info', sort: 2, config: { desc: '活动信息' } },
    { type: 'rewards', sort: 3, config: {} },
    { type: 'contact', sort: 4, config: { wechat: 'ACT_WX' } },
    { type: 'message', sort: 5, config: { placeholder: '留言' } },
  ];
  const r1 = await mkAct(mkTitle('聚合'), {
    promoTemplate: 'summit',
    promoModules: modulesLegal,
    promoContact: null,
    rewardConfig: { loginEnabled: true, channel: { type: 'contact', label: '留联系方式' }, selectMode: 'all', rewards: [{ id: 'r1', name: '到场礼', type: 'points', amount: 10, mode: 'single' }] },
  });
  const act1 = r1.json?.data || r1.json;
  check('创建聚合活动成功', r1.status === 200 && !!act1?.documentId, `status=${r1.status} ${JSON.stringify(r1.json)}`);
  if (!act1?.documentId) { console.error('建活动失败，终止'); process.exit(1); }

  const promo1 = await api('GET', `/zhao-point/v1/promo/activity/${act1.documentId}`, {});
  const p1 = promo1.json?.data || {};
  const keys1 = Object.keys(p1).sort();
  check('promo 返回五键 activity/modules/contact/rewards/signupStatus', promo1.status === 200 && JSON.stringify(keys1) === JSON.stringify(['activity', 'contact', 'modules', 'rewards', 'signupStatus']), `keys=${keys1.join(',')} status=${promo1.status}`);
  check('promo.activity.documentId 一致', p1.activity?.documentId === act1.documentId, `got=${p1.activity?.documentId}`);
  check('promo.modules 为数组', Array.isArray(p1.modules), JSON.stringify(p1.modules));
  check('promo.modules 长度=5 且类型合法', Array.isArray(p1.modules) && p1.modules.length === 5 && p1.modules.every((m) => ['cover','info','rewards','contact','message'].includes(m.type)), JSON.stringify((p1.modules || []).map((m) => m.type)));
  const sorts1 = (p1.modules || []).map((m) => m.sort);
  check('promo.modules sort 升序', Array.isArray(sorts1) && sorts1.every((s, i) => i === 0 || sorts1[i - 1] <= s), JSON.stringify(sorts1));
  check('promo.contact 为空(活动与站点均未配置)', promo1.status === 200 && (p1.contact === null || p1.contact === undefined), JSON.stringify(p1.contact));
  check('promo.rewards.enabled=true(摘要)', p1.rewards?.enabled === true && Array.isArray(p1.rewards?.rewards), JSON.stringify(p1.rewards));
  check('promo.signupStatus.signedUp=false(匿名)', p1.signupStatus?.signedUp === false, JSON.stringify(p1.signupStatus));

  // ================== 测试 2：模块归一化 + 400 校验 ==================
  console.log('\n--- 测试 2：模块归一化 ---');
  const messy = [
    { type: 'cover', sort: 2, config: { title: 'C' } },
    { type: 'badtype', sort: 0, config: { x: 1 } },
    { type: 'info', sort: 1, config: {} },
    { type: 'faq', sort: 2, config: { q: 1 } },   // sort=2 与 cover 冲突 → 去重
    { type: 'cover', sort: 0, config: { t2: 'x' } },
  ];
  const r2 = await mkAct(mkTitle('归一化'), { promoTemplate: 'training', promoModules: messy });
  const act2 = r2.json?.data || r2.json;
  check('创建归一化活动成功', r2.status === 200 && !!act2?.documentId, `status=${r2.status} ${JSON.stringify(r2.json)}`);
  if (!act2?.documentId) { console.error('建活动失败，终止'); process.exit(1); }
  const db2 = await q(`SELECT promo_modules::text AS pm, promo_template AS pt FROM activities WHERE document_id = $1`, [act2.documentId]);
  let stored2 = null;
  try { stored2 = db2[0] ? JSON.parse(db2[0].pm) : null; } catch {}
  check('存库 promoModules 仅合法 type(非法 badtype 被过滤)', Array.isArray(stored2) && stored2.every((m) => !['badtype'].includes(m.type)) && stored2.some((m) => m.type === 'cover') && stored2.some((m) => m.type === 'info'), JSON.stringify(stored2));
  check('存库 sort 去重且升序', Array.isArray(stored2) && stored2.map((m) => m.sort).every((s, i) => i === 0 || stored2[i - 1].sort < s), JSON.stringify((stored2 || []).map((m) => [m.type, m.sort])));
  check('存库 sort 序列=0,1,2', Array.isArray(stored2) && JSON.stringify(stored2.map((m) => m.sort)) === JSON.stringify([0, 1, 2]), JSON.stringify((stored2 || []).map((m) => m.sort)));
  check('存库 promoTemplate=training', db2[0]?.pt === 'training', `got=${db2[0]?.pt}`);

  // 更新路径: 再次混入非法+冲突 → 归一化落库
  const r2u = await api('PUT', `/zhao-point/v1/admin/adm/activities/${act2.documentId}`, {
    token: adminToken, body: { promoModules: [{ type: 'info', sort: 5 }, { type: 'badtype', sort: 1 }, { type: 'cover', sort: 5 }, { type: 'agenda', sort: 3 }] },
  });
  check('update 归一化活动成功', r2u.status === 200, `status=${r2u.status} ${JSON.stringify(r2u.json)}`);
  const db2u = await q(`SELECT promo_modules::text AS pm FROM activities WHERE document_id = $1`, [act2.documentId]);
  let stored2u = null;
  try { stored2u = db2u[0] ? JSON.parse(db2u[0].pm) : null; } catch {}
  check('update 后存库仅 agenda/info(cover 与 info sort=5 冲突被去重) 且升序', Array.isArray(stored2u) && JSON.stringify(stored2u.map((m) => m.type)) === JSON.stringify(['agenda', 'info']) && JSON.stringify(stored2u.map((m) => m.sort)) === JSON.stringify([3, 5]), JSON.stringify((stored2u || []).map((m) => [m.type, m.sort])));

  // promoTemplate 非法 → 400
  const rBadTpl = await mkAct(mkTitle('bad-tpl'), { promoTemplate: 'not-a-template' });
  check('promoTemplate 非法 → 400', rBadTpl.status === 400, `status=${rBadTpl.status} ${JSON.stringify(rBadTpl.json)}`);
  // promoContact 非对象 → 400
  const rBadC1 = await mkAct(mkTitle('bad-contact'), { promoContact: 'just-a-string' });
  check('promoContact 字符串 → 400', rBadC1.status === 400, `status=${rBadC1.status} ${JSON.stringify(rBadC1.json)}`);
  const rBadC2 = await mkAct(mkTitle('bad-contact-arr'), { promoContact: [1, 2] });
  check('promoContact 数组 → 400', rBadC2.status === 400, `status=${rBadC2.status} ${JSON.stringify(rBadC2.json)}`);

  // ================== 测试 3：留言闭环 ==================
  console.log('\n--- 测试 3：留言闭环 ---');
  const u1 = await register(nm('msg'));
  check('注册测试用户', !!u1.token && !!u1.id, JSON.stringify(u1.raw).slice(0, 80));
  const msgContent = `${MSG_MARKER} 我想咨询活动安排`;
  const rMsg = await api('POST', `/zhao-point/v1/my/activity/${act1.documentId}/message`, { token: u1.token, body: { content: msgContent } });
  const m1 = rMsg.json?.data || {};
  check('POST message 返回 documentId/status/createdAt', rMsg.status === 200 && !!m1.documentId && m1.status === 'open' && !!m1.createdAt, `${rMsg.status} ${JSON.stringify(rMsg.json)}`);
  const msgDocId = m1.documentId;

  const rMine = await api('GET', `/zhao-point/v1/my/activity/${act1.documentId}/messages`, { token: u1.token });
  const mine = rMine.json?.data || [];
  check('我的留言列表可见该留言', Array.isArray(mine) && mine.some((x) => x.documentId === msgDocId && x.content === msgContent), JSON.stringify(mine));

  const rAdminListOpen = await api('GET', `/zhao-point/v1/admin/adm/activity-messages?activity=${act1.documentId}&status=open&page=1&pageSize=20`, { token: adminToken });
  const adminOpen = rAdminListOpen.json?.data || [];
  check('adminList 按 activity+status=open 过滤命中', rAdminListOpen.status === 200 && Array.isArray(adminOpen) && adminOpen.some((x) => x.documentId === msgDocId && x.status === 'open'), `${rAdminListOpen.status} ${JSON.stringify(rAdminListOpen.json)}`);
  check('adminList meta.pagination 存在', !!rAdminListOpen.json?.meta?.pagination, JSON.stringify(rAdminListOpen.json?.meta));

  const rReply = await api('PUT', `/zhao-point/v1/admin/adm/activity-messages/${msgDocId}/reply`, { token: adminToken, body: { reply: '已收到，活动当天见' } });
  const rep = rReply.json?.data || {};
  check('PUT reply 返回 replied', rReply.status === 200 && rep.documentId === msgDocId && rep.status === 'replied' && !!rep.repliedAt, `${rReply.status} ${JSON.stringify(rReply.json)}`);

  const rMine2 = await api('GET', `/zhao-point/v1/my/activity/${act1.documentId}/messages`, { token: u1.token });
  const mine2 = rMine2.json?.data || [];
  const mm = mine2.find((x) => x.documentId === msgDocId);
  check('我的留言可见 reply 且 status=replied', !!mm && mm.reply === '已收到，活动当天见' && mm.status === 'replied' && !!mm.repliedAt, JSON.stringify(mm));

  const rAdminListReplied = await api('GET', `/zhao-point/v1/admin/adm/activity-messages?activity=${act1.documentId}&status=replied`, { token: adminToken });
  const adminReplied = rAdminListReplied.json?.data || [];
  check('adminList 按 status=replied 过滤命中', Array.isArray(adminReplied) && adminReplied.some((x) => x.documentId === msgDocId && x.status === 'replied'), JSON.stringify(adminReplied.map((x) => x.documentId)));
  check('adminList 空留言校验(回复内容为空→400)', (await api('PUT', `/zhao-point/v1/admin/adm/activity-messages/${msgDocId}/reply`, { token: adminToken, body: { reply: '   ' } })).status === 400);

  // ================== 测试 4：联系方式合并 ==================
  console.log('\n--- 测试 4：联系方式合并(站点兜底 + 活动优先) ---');
  // 站点兜底: 向默认回退站点(id 最小)的 extraConfig 写入 promoContact
  const siteRows = await q(`SELECT id::int AS id, document_id AS did, extra_config::text AS ec FROM zhao_site_configs ORDER BY id ASC LIMIT 1`);
  const site = siteRows[0];
  check('存在默认站点(回退)', !!site?.did, JSON.stringify(siteRows));
  let origEc = null;
  try { origEc = site.ec ? JSON.parse(site.ec) : {}; } catch { origEc = {}; }
  const siteContact = { wechat: 'SITE_WX_001', phone: '13800009999' };
  await client.query(`UPDATE zhao_site_configs SET extra_config = $1 WHERE id = $2`, [JSON.stringify({ ...origEc, promoContact: siteContact }), site.id]);
  try {
    const rS = await mkAct(mkTitle('站点兜底'), { promoTemplate: 'life', promoModules: [{ type: 'info', sort: 0, config: {} }] });
    const actS = rS.json?.data || rS.json;
    check('创建无 promoContact 活动成功', rS.status === 200 && !!actS?.documentId, `status=${rS.status} ${JSON.stringify(rS.json)}`);
    let actSId = actS?.id;
    if (!actSId) {
      const found = await q(`SELECT id::int AS id FROM activities WHERE document_id = $1`, [actS?.documentId]);
      actSId = found[0]?.id;
    }
    if (actS?.documentId) {
      const promo = await api('GET', `/zhao-point/v1/promo/activity/${actS.documentId}`, {});
      const pS = promo.json?.data || {};
      check('站点 extraConfig.promoContact 兜底生效', pS.contact?.wechat === 'SITE_WX_001' && pS.contact?.phone === '13800009999', JSON.stringify(pS.contact));
      // 活动配置 promoContact → 活动优先
      const rU = await api('PUT', `/zhao-point/v1/admin/adm/activities/${actS.documentId}`, { token: adminToken, body: { promoContact: { wechat: 'ACT_WX_002', phone: '13800001111' } } });
      check('活动配置 promoContact 成功', rU.status === 200, `status=${rU.status} ${JSON.stringify(rU.json)}`);
      const promo2 = await api('GET', `/zhao-point/v1/promo/activity/${actS.documentId}`, {});
      const pS2 = promo2.json?.data || {};
      check('活动 promoContact 优先于站点', pS2.contact?.wechat === 'ACT_WX_002' && pS2.contact?.phone === '13800001111', JSON.stringify(pS2.contact));
    }
    if (actSId) await purgeActivity(actSId);
  } finally {
    await client.query(`UPDATE zhao_site_configs SET extra_config = $1 WHERE id = $2`, [JSON.stringify(origEc), site.id]);
    const after = await q(`SELECT extra_config::text AS ec FROM zhao_site_configs WHERE id = $1`, [site.id]);
    let nowEc = null;
    try { nowEc = after[0]?.ec ? JSON.parse(after[0].ec) : null; } catch {}
    check('站点 extraConfig 已还原', JSON.stringify(nowEc) === JSON.stringify(origEc), `now=${after[0]?.ec}`);
  }

  // ================== 测试 5：零残留 ==================
  console.log('\n--- 清理(零残留) ---');
  await purgeResidue();
  // 再兜底: 活动 API 删除(若存在)
  for (const d of [act1.documentId, act2.documentId]) {
    await api('DELETE', `/zhao-point/v1/admin/adm/activities/${d}`, { token: adminToken });
  }
  await purgeResidue();
  const res = await q(`SELECT
      (SELECT count(*)::int FROM activities WHERE title LIKE $1) a,
      (SELECT count(*)::int FROM activity_messages WHERE content LIKE $2) m,
      (SELECT count(*)::int FROM activity_messages am WHERE NOT EXISTS (SELECT 1 FROM activity_messages_activity_lnk al WHERE al.activity_message_id = am.id) AND am.content LIKE $2) mo,
      (SELECT count(*)::int FROM up_users WHERE username LIKE $3) u`,
    [`${ACT_TITLE_PREFIX}%`, `%${MSG_MARKER}%`, `${PF}%`]);
  const r = res[0];
  check(`活动零残留(${r.a}) 留言零残留(${r.m}) 孤儿留言零残留(${r.mo}) 测试用户零残留(${r.u})`,
    r.a === 0 && r.m === 0 && r.mo === 0 && r.u === 0);

  await client.end();
  console.log('\n===== 验收结果 =====');
  out.forEach((l) => console.log(l));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
