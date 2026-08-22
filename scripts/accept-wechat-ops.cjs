/* 微信公众号运营二期(关键字回复 / 永久素材 / 图文草稿+发布) 验收
 * 用法: cd e:\code\basic && node scripts/accept-wechat-ops.cjs
 * 前置: 本地 Strapi develop(127.0.0.1:1337) 已以 MSG_WECHAT_PROVIDER=mock 启动; zhao-sso 插件 dist 已构建
 * 覆盖:
 *  1. admin /wx/replies: POST 建 welcome/fallback/keyword 规则, GET 列表可查, PUT 更新, DELETE 删除
 *  2. admin /wx/materials: POST multipart({type,name,file}) → mock 固定 media_id 前缀 mock_media_ 并落库; GET 列表; DELETE :id
 *  3. admin /wx/articles: POST 建草稿(draft_id 前缀 mock_draft_ / publish_state=draft) →
 *     POST :id/publish(publish_state=publishing / publish_id 前缀 mock_publish_) →
 *     GET :id/status(mock 一次即 published / wx_published_at 非空) →
 *     PUT 已发布返回 400 → DELETE 清理
 *  4. 回调分流: 不调微信, 仅验证 admin 权限(不带 token 401/403, 带 token 200)
 *  5. 清理零残留(三条新表 wops_% 标识)
 */
const { Client } = require('pg');

const BASE = 'http://127.0.0.1:1337/api';
const ZBASE = BASE + '/zhao-sso/v1';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'wops_'; // 测试标识前缀

let PASS = 0, FAIL = 0;
const out = [];
const check = (name, cond, detail = '') => {
  if (cond) PASS++; else FAIL++;
  out.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let client;

async function api(method, path, { token, body, formData } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let payload;
  if (formData !== undefined) {
    payload = formData; // fetch 自动带 multipart boundary, 不手动设 Content-Type
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let r;
  for (let i = 0; i < 25; i++) {
    try {
      r = await fetch(BASE + path, { method, headers, body: payload });
      break;
    } catch (e) { if (i === 24) return { status: 0, json: { netErr: e.message } }; await sleep(600); }
  }
  let textPayload = '';
  try { textPayload = await r.text(); } catch {}
  let json = null;
  try { json = JSON.parse(textPayload); } catch {}
  return { status: r.status, json, text: () => textPayload };
}

/** multipart 上传便利: 构造 {type,name,file} FormData */
function fdOf(type, name, filename, content, mime) {
  const fd = new FormData();
  fd.append('type', type);
  fd.append('name', name);
  fd.append('file', new Blob([Buffer.from(content)], { type: mime || 'application/octet-stream' }), filename);
  return fd;
}

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    const r = await api('POST', '/zhao-auth/v1/login', { body: { identifier: '1117', password: 'a123456' } });
    if (r.status === 200 && r.json?.jwt) return r.json;
    await sleep(800);
  }
  return null;
}
const tokenOf = (j) =>
  (j && (j.jwt || j.access_token || j.token || (j.data && (j.data.jwt || j.data.token || j.data.access_token)))) || null;
const q = async (sql, params) => (await client.query(sql, params)).rows;

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');
  const ts = Date.now();
  const RND = Math.floor(Math.random() * 1e6);
  const nm = (s) => `${PF}${s}_${ts}_${RND}`;
  const RKEY = nm('kw');               // keyword 命中串(唯一)
  const RTX_WELCOME = nm('replyWel');  // 欢迎规则文本标识
  const RTX_FALLBACK = nm('replyFb');  // 兜底规则文本标识
  const RTX_KW = nm('replyKw');        // 关键字规则文本标识
  const MAT_NAME = nm('mat');
  const ART_TITLE = nm('art');

  // ---- 清场(开头) ----
  await client.query(`DELETE FROM sso_wx_replies WHERE text LIKE '${PF}%' OR match LIKE '${PF}%'`);
  await client.query(`DELETE FROM sso_wx_materials WHERE name LIKE '${PF}%'`);
  await client.query(`DELETE FROM sso_wx_articles WHERE title LIKE '${PF}%'`);

  // ---- admin 登录(1117) ----
  const adminLogin = await waitForServer();
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt(无需新建用户)', !!adminToken, JSON.stringify(adminLogin).slice(0, 80));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  // ============ 4. 权限: 不带 token 401/403, 带 token 200 ============
  {
    const noAuth = await api('GET', '/zhao-sso/v1/admin/wx/replies');
    check('GET /wx/replies 不带 token 拒绝(401/403)', [401, 403].includes(noAuth.status), `status=${noAuth.status}`);
    const withAuth = await api('GET', '/zhao-sso/v1/admin/wx/replies', { token: adminToken });
    check('GET /wx/replies 带 token 放行(200)', withAuth.status === 200, `status=${withAuth.status}`);
  }

  // ============ 1. 关键字回复 ============
  let wel, fb, kw, kwId;
  {
    const rw = await api('POST', '/zhao-sso/v1/admin/wx/replies', { token: adminToken, body: { trigger: 'welcome', reply_type: 'text', text: RTX_WELCOME } });
    wel = rw.json && rw.json.data;
    check('POST /wx/replies 创建 welcome 成功', rw.status === 200 && !!wel && !!wel.id, `${rw.status} ${JSON.stringify(rw.json).slice(0, 100)}`);
    check('welcome.trigger=welcome', wel && wel.trigger === 'welcome', `tr=${wel && wel.trigger}`);

    const rf = await api('POST', '/zhao-sso/v1/admin/wx/replies', { token: adminToken, body: { trigger: 'fallback', reply_type: 'text', text: RTX_FALLBACK } });
    fb = rf.json && rf.json.data;
    check('POST /wx/replies 创建 fallback 成功', rf.status === 200 && !!fb && !!fb.id, `${rf.status} ${JSON.stringify(rf.json).slice(0, 100)}`);

    const rk = await api('POST', '/zhao-sso/v1/admin/wx/replies', { token: adminToken, body: { trigger: 'keyword', match: RKEY, reply_type: 'text', text: RTX_KW } });
    kw = rk.json && rk.json.data;
    kwId = kw && kw.id;
    check('POST /wx/replies 创建 keyword 成功', rk.status === 200 && !!kw && !!kw.id, `${rk.status} ${JSON.stringify(rk.json).slice(0, 100)}`);
    check('keyword.reply_type=text 且 match 落库', kw && kw.reply_type === 'text' && kw.match === RKEY, `m=${kw && kw.match}`);

    const list = await api('GET', `/zhao-sso/v1/admin/wx/replies?pageSize=50`, { token: adminToken });
    const ldata = list.json && list.json.data;
    const hasAll = Array.isArray(ldata) && [wel, fb, kw].every((r) => r && ldata.some((x) => x.id === r.id));
    check('GET /wx/replies 列表可查(含 welcome/fallback/keyword 三条)', list.status === 200 && hasAll, `${list.status} len=${Array.isArray(ldata) ? ldata.length : 'na'}`);

    const upd = await api('PUT', `/zhao-sso/v1/admin/wx/replies/${kwId}`, { token: adminToken, body: { text: RTX_KW + '_v2', sort: 5 } });
    const ud = upd.json && upd.json.data;
    check('PUT /wx/replies/:id 更新成功且生效', upd.status === 200 && ud && String(ud.text).endsWith('_v2'), `${upd.status} text=${ud && ud.text}`);

    const d1 = await api('DELETE', `/zhao-sso/v1/admin/wx/replies/${wel.id}`, { token: adminToken });
    check('DELETE /wx/replies/:id welcome 成功', d1.status === 200, `${d1.status}`);
    const d2 = await api('DELETE', `/zhao-sso/v1/admin/wx/replies/${fb.id}`, { token: adminToken });
    check('DELETE /wx/replies/:id fallback 成功', d2.status === 200, `${d2.status}`);
    const d3 = await api('DELETE', `/zhao-sso/v1/admin/wx/replies/${kwId}`, { token: adminToken });
    check('DELETE /wx/replies/:id keyword 成功', d3.status === 200, `${d3.status}`);
  }

  // ============ 2. 永久素材(multipart) ============
  let matId, matName;
  {
    const r = await api('POST', '/zhao-sso/v1/admin/wx/materials',
      { token: adminToken, formData: fdOf('image', MAT_NAME, 'accept.png', 'accept-wx-material-bytes', 'image/png') });
    const data = r.json && r.json.data;
    matId = data && data.id;
    matName = data && data.name;
    check('POST /wx/materials multipart 上传成功', r.status === 200 && !!data && !!data.id, `${r.status} ${JSON.stringify(r.json).slice(0, 120)}`);
    check('返回 media_id 前缀 mock_media_', data && String(data.media_id).startsWith('mock_media_'), `media_id=${data && data.media_id}`);
    check('返回 type=image / name 落库', data && data.type === 'image' && data.name === MAT_NAME, `t=${data && data.type} n=${data && data.name}`);

    const dbRow = (await q(`SELECT media_id FROM sso_wx_materials WHERE id=$1`, [matId]))[0];
    check('素材已落库(sso_wx_materials.media_id)', dbRow && String(dbRow.media_id).startsWith('mock_media_'), `db=${dbRow && dbRow.media_id}`);

    const list = await api('GET', `/zhao-sso/v1/admin/wx/materials?name=${PF}`, { token: adminToken });
    const ldata = list.json && list.json.data;
    check('GET /wx/materials 列表可查(含测试素材)', list.status === 200 && Array.isArray(ldata) && ldata.some((m) => m.id === matId), `${list.status} len=${Array.isArray(ldata) ? ldata.length : 'na'}`);

    const del = await api('DELETE', `/zhao-sso/v1/admin/wx/materials/${matId}`, { token: adminToken });
    check('DELETE /wx/materials/:id 成功', del.status === 200, `${del.status}`);
  }

  // ============ 3. 图文草稿 + 发布 ============
  let artId;
  {
    const rc = await api('POST', '/zhao-sso/v1/admin/wx/articles',
      { token: adminToken, body: { title: ART_TITLE, author: 'accept', digest: 'accept digest', content: '<p>accept</p>' } });
    const cd = rc.json && rc.json.data;
    artId = cd && cd.id;
    check('POST /wx/articles 创建草稿成功', rc.status === 200 && !!cd && !!cd.id, `${rc.status} ${JSON.stringify(rc.json).slice(0, 120)}`);
    check('返回 draft_id 前缀 mock_draft_ 且 publish_state=draft', cd && String(cd.draft_id).startsWith('mock_draft_') && cd.publish_state === 'draft', `draft=${cd && cd.draft_id} st=${cd && cd.publish_state}`);

    const rp = await api('POST', `/zhao-sso/v1/admin/wx/articles/${artId}/publish`, { token: adminToken });
    const pd = rp.json && rp.json.data;
    check('POST /wx/articles/:id/publish 置 publishing', rp.status === 200 && pd && pd.publish_state === 'publishing', `st=${pd && pd.publish_state}`);
    check('publish 返回 publish_id 前缀 mock_publish_', rp.status === 200 && pd && String(pd.publish_id).startsWith('mock_publish_'), `pid=${pd && pd.publish_id}`);

    const rs = await api('GET', `/zhao-sso/v1/admin/wx/articles/${artId}/status`, { token: adminToken });
    const sd = rs.json && rs.json.data;
    check('GET /wx/articles/:id/status 一次即 published', rs.status === 200 && sd && sd.publish_state === 'published', `${rs.status} st=${sd && sd.publish_state}`);
    check('published 后 wx_published_at 非空', sd && !!sd.wx_published_at, `at=${sd && sd.wx_published_at}`);

    const ru = await api('PUT', `/zhao-sso/v1/admin/wx/articles/${artId}`, { token: adminToken, body: { title: ART_TITLE + '_x' } });
    check('PUT 已发布图文返回 400', ru.status === 400, `${ru.status} ${JSON.stringify(ru.json).slice(0, 80)}`);

    const rd = await api('DELETE', `/zhao-sso/v1/admin/wx/articles/${artId}`, { token: adminToken });
    check('DELETE /wx/articles/:id 清理成功', rd.status === 200, `${rd.status}`);
  }

  // ============ 5. 清理 + 零残留 ============
  await client.query(`DELETE FROM sso_wx_replies WHERE text LIKE '${PF}%' OR match LIKE '${PF}%'`);
  await client.query(`DELETE FROM sso_wx_materials WHERE name LIKE '${PF}%'`);
  await client.query(`DELETE FROM sso_wx_articles WHERE title LIKE '${PF}%'`);

  const residue = (await q(`SELECT
      (SELECT count(*)::int FROM sso_wx_replies WHERE text LIKE '${PF}%' OR match LIKE '${PF}%') rp,
      (SELECT count(*)::int FROM sso_wx_materials WHERE name LIKE '${PF}%') mt,
      (SELECT count(*)::int FROM sso_wx_articles WHERE title LIKE '${PF}%') ar`))[0];
  check(`清理完成零残留(reply=${residue.rp} material=${residue.mt} article=${residue.ar})`,
    residue.rp === 0 && residue.mt === 0 && residue.ar === 0);

  await client.end();
  console.log('\n===== 验收结果 =====');
  out.forEach((x) => console.log(x));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  console.log('说明：本脚本复用 POST/PUT/DELETE 响应的 {data:row} 包装；字段名以运行时实际返回为准。');
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });