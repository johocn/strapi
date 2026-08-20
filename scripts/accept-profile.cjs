// 用户画像分层与合伙人精准客户分层 后端验收
// 覆盖：admin 画像列表/重算/详情 → 造 sso 测试数据(合伙人/客户/越权者+分销关系) → 合伙人 sso 登录 → 下线客户/画像详情/触达/跟进 → 越权 403 → 清理测试数据
// 要求：本地 Strapi 已运行(127.0.0.1:1337)，无需重启
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const pg = require('pg');
const bcrypt = require(path.join(__dirname, '../plugins/zhao-sso/node_modules/bcryptjs'));
const BASE = 'http://127.0.0.1:1337';

const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'sso_pf_';           // 测试用户用户名前缀（清理按此匹配）
const PWD = 'Profile123';       // 测试 sso 用户统一密码

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

async function pgQuery(sql, params) {
  const c = new pg.Client(PG);
  await c.connect();
  const res = await c.query(sql, params);
  await c.end();
  return res.rows;
}
const esc = (n) => n.map((x, i) => '$' + (i + 1)).join(',');
const subIds = (ids) => ids.length ? '(' + ids.join(',') + ')' : '(NULL)';

/** 清理所有 sso_pf_* 测试数据（幂等，可重复运行） */
async function cleanupPf() {
  const ids = (await pgQuery("SELECT id FROM sso_users WHERE username LIKE $1", [PF + '%'])).map((r) => r.id);
  if (ids.length) {
    const S = subIds(ids);
    const collect = async (sql) => (await pgQuery(sql, [])).map((r) => r.id);
    // 先收集主表 id（避免先删链接表导致主表子查询失效产生孤儿行）
    const tokIds = await collect(`SELECT sso_token_id AS id FROM sso_tokens_user_lnk WHERE sso_user_id IN ${S}`);
    const llIds = await collect(`SELECT sso_login_log_id AS id FROM sso_login_logs_user_lnk WHERE sso_user_id IN ${S}`);
    const jobIds = await collect(`SELECT msg_job_id AS id FROM sso_msg_jobs_user_lnk WHERE sso_user_id IN ${S}`);
    const fupIds = await collect(`SELECT sso_follow_up_id AS id FROM sso_follow_ups_partner_lnk WHERE sso_user_id IN ${S} UNION SELECT sso_follow_up_id FROM sso_follow_ups_customer_lnk WHERE sso_user_id IN ${S}`);
    const relIds = await collect(`SELECT sso_referral_relation_id AS id FROM sso_referral_relations_inviter_lnk WHERE sso_user_id IN ${S} UNION SELECT sso_referral_relation_id FROM sso_referral_relations_invitee_lnk WHERE sso_user_id IN ${S}`);
    const profIds = await collect(`SELECT sso_user_profile_id AS id FROM sso_user_profiles_user_lnk WHERE sso_user_id IN ${S}`);
    const roleIds = await collect(`SELECT sso_user_app_role_id AS id FROM sso_user_app_roles_user_lnk WHERE sso_user_id IN ${S}`);
    // 链接表
    await pgQuery(`DELETE FROM sso_tokens_user_lnk WHERE sso_user_id IN ${S}`);
    await pgQuery(`DELETE FROM sso_login_logs_user_lnk WHERE sso_user_id IN ${S}`);
    await pgQuery(`DELETE FROM sso_msg_jobs_user_lnk WHERE sso_user_id IN ${S}`);
    await pgQuery(`DELETE FROM sso_follow_ups_partner_lnk WHERE sso_user_id IN ${S}`);
    await pgQuery(`DELETE FROM sso_follow_ups_customer_lnk WHERE sso_user_id IN ${S}`);
    await pgQuery(`DELETE FROM sso_referral_relations_inviter_lnk WHERE sso_user_id IN ${S}`);
    await pgQuery(`DELETE FROM sso_referral_relations_invitee_lnk WHERE sso_user_id IN ${S}`);
    await pgQuery(`DELETE FROM sso_user_profiles_user_lnk WHERE sso_user_id IN ${S}`);
    await pgQuery(`DELETE FROM sso_user_app_roles_user_lnk WHERE sso_user_id IN ${S}`);
    // 主表
    if (tokIds.length) await pgQuery(`DELETE FROM sso_tokens WHERE id IN ${subIds(tokIds)}`);
    if (llIds.length) await pgQuery(`DELETE FROM sso_login_logs WHERE id IN ${subIds(llIds)}`);
    if (jobIds.length) await pgQuery(`DELETE FROM sso_msg_jobs WHERE id IN ${subIds(jobIds)}`);
    if (fupIds.length) await pgQuery(`DELETE FROM sso_follow_ups WHERE id IN ${subIds(fupIds)}`);
    if (relIds.length) await pgQuery(`DELETE FROM sso_referral_relations WHERE id IN ${subIds(relIds)}`);
    if (profIds.length) await pgQuery(`DELETE FROM sso_user_profiles WHERE id IN ${subIds(profIds)}`);
    if (roleIds.length) await pgQuery(`DELETE FROM sso_user_app_roles WHERE id IN ${subIds(roleIds)}`);
  }
  await pgQuery("DELETE FROM up_users WHERE username LIKE $1", [PF + '%']);
  await pgQuery("DELETE FROM sso_users WHERE username LIKE $1", [PF + '%']);
  return ids.length;
}

(async () => {
  // ---------- 0. admin 登录（zhao-auth） ----------
  let r = await req('POST', '/api/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  const token = r.data && (r.data.jwt || r.data.token || (r.data.data && r.data.data.token));
  ok('zhao-auth admin 登录', !!token, `status=${r.status}`);
  if (!token) return;

  // 预清理历史测试数据（幂等）
  const cleaned = await cleanupPf();
  ok('预清理历史 sso_pf_* 测试数据', true, `清理用户=${cleaned}`);

  // ---------- 1. admin 画像列表 ----------
  r = await req('GET', '/api/zhao-sso/v1/admin/profiles?page=1&pageSize=20', null, token);
  ok('admin 画像列表(200)', r.status === 200 && Array.isArray(r.data && r.data.data), `status=${r.status} total=${r.data && r.data.meta && r.data.meta.pagination && r.data.meta.pagination.total}`);

  // ---------- 2. 全量重算 ----------
  r = await req('POST', '/api/zhao-sso/v1/admin/profiles/recalc-all', {}, token);
  const recalc = r.data && r.data.data;
  ok('画像全量重算 recalc-all', r.status === 200 && recalc && typeof recalc.calculated === 'number' && recalc.calculated >= 0,
    `status=${r.status} scanned=${recalc && recalc.scanned} calculated=${recalc && recalc.calculated}`);

  // ---------- 3. 造测试数据：sso 用户(合伙人/客户/越权者) + up_users 匹配 + 分销关系 ----------
  const ts = Date.now();
  const pName = PF + 'partner_' + ts, cName = PF + 'customer_' + ts, oName = PF + 'other_' + ts;
  const cEmail = cName + '@shenglin.vip';
  const hash = bcrypt.hashSync(PWD, 12);
  const insUser = async (username, email) => {
    const rows = await pgQuery(
      'INSERT INTO sso_users (document_id, uuid, username, email, password_hash, status, register_channel, login_count, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),now()) RETURNING id',
      [crypto.randomUUID(), crypto.randomUUID(), username, email, hash, 'active', 'accept', 0]
    );
    return rows[0].id;
  };
  const partnerId = await insUser(pName, pName + '@shenglin.vip');
  const customerId = await insUser(cName, cEmail);
  const otherId = await insUser(oName, oName + '@shenglin.vip');
  ok('造 sso 测试用户(合伙人/客户/越权者)', !!partnerId && !!customerId && !!otherId,
    `partner=${partnerId} customer=${customerId} other=${otherId}`);

  // 客户 sso 用户同步到 up_users（供画像反向桥接，username 匹配）
  const up = await pgQuery(
    "INSERT INTO up_users (document_id, username, email, provider, confirmed, blocked, created_at, updated_at) VALUES ($1,$2,$3,'local',true,false,now(),now()) RETURNING id",
    [crypto.randomUUID(), cName, cEmail]
  );
  ok('客户 up_users 匹配行就绪', !!up[0], `upUserId=${up[0] && up[0].id}`);

  // 分销关系：inviter=合伙人, invitee=客户（level 必填）
  const rel = await pgQuery(
    "INSERT INTO sso_referral_relations (document_id, level, channel_code, created_at, updated_at) VALUES ($1,1,'accept',now(),now()) RETURNING id",
    [crypto.randomUUID()]
  );
  if (rel[0]) {
    await pgQuery('INSERT INTO sso_referral_relations_inviter_lnk (sso_referral_relation_id, sso_user_id) VALUES ($1,$2)', [rel[0].id, partnerId]);
    await pgQuery('INSERT INTO sso_referral_relations_invitee_lnk (sso_referral_relation_id, sso_user_id) VALUES ($1,$2)', [rel[0].id, customerId]);
  }
  ok('分销关系 sso_referral_relations 就绪', !!rel[0], `relId=${rel[0] && rel[0].id} inviter=${partnerId} invitee=${customerId}`);

  // ---------- 4. 重算后 admin 画像详情（客户有 sso-user 匹配） ----------
  r = await req('POST', '/api/zhao-sso/v1/admin/profiles/recalc-all', {}, token);
  const recalc2 = r.data && r.data.data;
  ok('重算包含客户画像(calculated≥1)', r.status === 200 && recalc2 && recalc2.calculated >= 1,
    `calculated=${recalc2 && recalc2.calculated} scanned=${recalc2 && recalc2.scanned}`);

  r = await req('GET', `/api/zhao-sso/v1/admin/profiles/${customerId}`, null, token);
  const det = r.data && r.data.data;
  ok('admin 画像详情(200+segment/segmentReason)', r.status === 200 && det && det.segment && det.segmentReason,
    `status=${r.status} segment=${det && det.segment} score=${det && det.segmentScore} hasData=${det && det.hasData} reason=${det && det.segmentReason}`);
  const prow = await pgQuery('SELECT segment, segment_score, segment_reason, dimensions FROM sso_user_profiles WHERE id IN (SELECT sso_user_profile_id FROM sso_user_profiles_user_lnk WHERE sso_user_id=$1)', [customerId]);
  ok('画像落库 sso_user_profiles(dimensions)', prow[0] && prow[0].segment && prow[0].dimensions,
    `segment=${prow[0] && prow[0].segment} score=${prow[0] && prow[0].segment_score} dimKeys=${prow[0] && prow[0].dimensions ? Object.keys(prow[0].dimensions).join(',') : ''}`);

  // ---------- 5. 合伙人 sso 登录（type=password + app_code） ----------
  r = await req('POST', '/api/zhao-sso/v1/auth/login', { type: 'password', identifier: pName, password: PWD, app_code: 'accept' });
  const pToken = r.data && (r.data.access_token || r.data.token);
  ok('合伙人 sso 登录(password)', !!pToken && r.data && r.data.user && r.data.user.id === partnerId, `status=${r.status} ssoUserId=${r.data && r.data.ssoUserId}`);

  // 越权者 sso 登录
  r = await req('POST', '/api/zhao-sso/v1/auth/login', { type: 'password', identifier: oName, password: PWD, app_code: 'accept' });
  const oToken = r.data && (r.data.access_token || r.data.token);
  ok('越权者 sso 登录', !!oToken, `status=${r.status}`);

  // ---------- 6. partner 接口（合伙人视角） ----------
  if (pToken) {
    r = await req('GET', '/api/zhao-sso/v1/partner/my-customers', null, pToken);
    const mine = r.data && r.data.data;
    const hit = Array.isArray(mine) && mine.some((x) => x.id === customerId || x.username === cName);
    ok('partner/my-customers 含该客户', r.status === 200 && hit, `status=${r.status} count=${Array.isArray(mine) ? mine.length : '-'} seg=${Array.isArray(mine) && mine[0] && mine[0].profile && mine[0].profile.segment}`);

    r = await req('GET', `/api/zhao-sso/v1/partner/customers/${customerId}`, null, pToken);
    const pd = r.data && r.data.data;
    ok('partner/customers/:id 画像详情(200)', r.status === 200 && pd && pd.segment !== undefined, `status=${r.status} segment=${pd && pd.segment} hasData=${pd && pd.hasData}`);

    // act_confirm 模板就绪（缺则用 admin API 建）
    r = await req('GET', '/api/zhao-sso/v1/admin/msg-templates?page=1&pageSize=50', null, token);
    const tmpls = r.data && r.data.data;
    const hasTmpl = Array.isArray(tmpls) && tmpls.some((t) => t.code === 'act_confirm');
    let tmplStatus = hasTmpl ? '已存在' : '';
    if (!hasTmpl) {
      const cr = await req('POST', '/api/zhao-sso/v1/admin/msg-templates', {
        code: 'act_confirm', name: '活动报名成功确认', provider: 'wechat',
        wxTemplateId: 'T_ACT_CONFIRM', wxTemplateFields: [{ name: 'thing1', key: 'name' }, { name: 'date2', key: 'time' }],
        isEnabled: true, content: '您已报名成功：{name} {time}',
      }, token);
      tmplStatus = `本次创建=${cr.status === 200}`;
    }
    ok('消息模板 act_confirm 就绪', hasTmpl || tmplStatus.includes('true'), tmplStatus);

    r = await req('POST', `/api/zhao-sso/v1/partner/customers/${customerId}/touch`, { templateCode: 'act_confirm' }, pToken);
    const job = r.data && r.data.data;
    ok('partner/customers/:id/touch 返回 job', r.status === 200 && job && job.id,
      `status=${r.status} jobId=${job && job.id} jobStatus=${job && job.status} scene=${job && job.scene}`);

    r = await req('POST', '/api/zhao-sso/v1/partner/follow-ups', { customer: customerId, content: '画像验收跟进：确认分层意向', status: 'todo' }, pToken);
    const fup = r.data && r.data.data;
    ok('partner/follow-ups 创建跟进', r.status === 200 && fup && fup.id && fup.content, `status=${r.status} id=${fup && fup.id} status=${fup && fup.status}`);

    r = await req('GET', '/api/zhao-sso/v1/partner/follow-ups', null, pToken);
    const flist = r.data && r.data.data;
    ok('partner/follow-ups 列表含记录', r.status === 200 && Array.isArray(flist) && flist.some((x) => x.id === (fup && fup.id)), `status=${r.status} count=${Array.isArray(flist) ? flist.length : '-'}`);

    // ---------- 7. 越权验证 ----------
    if (oToken) {
      r = await req('GET', `/api/zhao-sso/v1/partner/customers/${customerId}`, null, oToken);
      ok('越权访问客户详情 403', r.status === 403, `status=${r.status} ${(r.data && r.data.error) || ''}`);
    }
  }

  // ---------- 8. 清理测试数据 ----------
  const removed = await cleanupPf();
  ok('清理验收测试数据(sso_pf_*)', true, `清理用户=${removed}`);
  console.log('\n--- 画像分层后端验收完成 ---');
  process.exit(0);
})().catch((e) => { console.error('脚本异常:', e && e.message); process.exit(1); });
