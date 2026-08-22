/* 微信公众号四功能 验收
 * 用法: cd e:\code\basic && node scripts/accept-wechat-official.cjs
 * 前置: 本地 Strapi develop(127.0.0.1:1337) 已以 MSG_WECHAT_PROVIDER=mock 启动; zhao-sso 插件 dist 已构建
 * 覆盖:
 *  1. GET /wechat/callback 验签: 正确 signature 返回 echostr(放行), 错误返回 403
 *  2. POST /wechat/callback 事件回调:
 *     - subscribe(qrscene_*) → 解析 scene_key 落库 sso_wx_events 且 openid_bound=true, 回填 binding.subscribe=1, 配 welcomeReply 返回文本XML
 *     - unsubscribe → 更新 binding.subscribe=0, 返回 'success'
 *     - text → 落库 event=text, 返回 'success'
 *  3. admin /wx/qrcodes: 创建 temporary/permanent(mock 返回 wx_url 含 ticket), 列表可查, GET /wx/events 可查, DELETE 清理
 *  4. admin /wx/menus: 保存 → :id/publish(mock 置 published) → GET /wx/templates 返回数组 / GET /wx/menu/remote
 *  5. admin /wx/server-config 读取 token
 *  6. 清理零残留(oauth-config 测试标识 / events / qrcodes / menus / bindings)
 */
const { Client } = require('pg');
const crypto = require('crypto');

const BASE = 'http://127.0.0.1:1337/api';
const ZBASE = BASE + '/zhao-sso/v1';
const PG = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin' };
const PF = 'wo_'; // 测试标识前缀

let PASS = 0, FAIL = 0;
const out = [];
const check = (name, cond, detail = '') => {
  if (cond) PASS++; else FAIL++;
  out.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let client;

async function api(method, path, { token, body, contentType, rawBody } = {}) {
  const headers = { 'Content-Type': contentType || 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let r;
  for (let i = 0; i < 25; i++) {
    try {
      r = await fetch(BASE + path, {
        method,
        headers,
        body: rawBody !== undefined ? rawBody : body ? JSON.stringify(body) : undefined,
      });
      break;
    } catch (e) { if (i === 24) return { status: 0, json: { netErr: e.message } }; await sleep(600); }
  }
  let textPayload = '';
  try { textPayload = await r.text(); } catch {}
  let json = null;
  try { json = JSON.parse(textPayload); } catch {}
  return { status: r.status, json, text: () => textPayload };
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

// 微信验签: sha1(sort([serverToken,timestamp,nonce]).join(""))
const wxSig = (ts, nonce, token) =>
  crypto.createHash('sha1').update([token, String(ts), String(nonce)].sort().join('')).digest('hex');

const evXml = (openid, eventName, eventKey) =>
  `<xml><ToUserName><![CDATA[gh_accept]]></ToUserName><FromUserName><![CDATA[${openid}]]></FromUserName>` +
  `<CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime><MsgType><![CDATA[event]]></MsgType>` +
  `<Event><![CDATA[${eventName}]]></Event>` +
  (eventKey ? `<EventKey><![CDATA[${eventKey}]]></EventKey>` : '') + `</xml>`;
const textXml = (openid, content) =>
  `<xml><ToUserName><![CDATA[gh_accept]]></ToUserName><FromUserName><![CDATA[${openid}]]></FromUserName>` +
  `<CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime><MsgType><![CDATA[text]]></MsgType>` +
  `<Content><![CDATA[${content}]]></Content></xml>`;

async function main() {
  client = new Client(PG);
  await client.connect();
  console.log('DB 已连接');
  const ts = Date.now();
  const RND = Math.floor(Math.random() * 1e6);
  const nm = (s) => `${PF}${s}_${ts}_${RND}`;
  const TOKEN = `accept_token_${ts}_${RND}`;
  const WELCOME = `accept欢迎语${ts}_${RND}`;
  const OPENID = nm('openid');
  const sceneKey = nm('scene'); // scene_key 值, 不再用冒号避免 SQL/URL 转义干扰

  // ---- 清场(开头) ----
  await client.query(`DELETE FROM sso_oauth_configs WHERE name LIKE '${PF}%'`);
  await client.query(`DELETE FROM sso_wx_events WHERE openid LIKE '${PF}%'`);
  await client.query(`DELETE FROM sso_wx_qrcodes WHERE scene_key LIKE '${PF}%'`);
  await client.query(`DELETE FROM sso_wx_menus WHERE name LIKE '${PF}%'`);
  await client.query(`DELETE FROM sso_third_party_bindings WHERE provider='wechat' AND provider_user_id LIKE '${PF}%'`);

  // ---- 预置 oauth-config(wechat/official_account): serverToken + welcomeReply ----
  const cfgIns = await client.query(
    `INSERT INTO sso_oauth_configs (document_id,name,provider,app_type,app_id,app_secret,extra_config,redirect_uris,is_enabled,created_at,updated_at)
     VALUES ($1,$2,'wechat','official_account', $3, $4, $5, '[]', true, now(), now()) RETURNING id`,
    [crypto.randomUUID(), nm('cfg'), 'wx_app_' + RND, 'secret_' + RND, JSON.stringify({ serverToken: TOKEN, welcomeReply: WELCOME })]);
  check('预置 sso-oauth-config(wechat/official_account) 成功', cfgIns.rows[0] && cfgIns.rows[0].id, `id=${cfgIns.rows[0].id} token=${TOKEN}`);

  // ---- 预置绑定(关注态测试用): 该 openid 已绑定 SSO, subscribe=0 ----
  const bindIns = await client.query(
    `INSERT INTO sso_third_party_bindings (document_id,provider,provider_user_id,bound_at,subscribe,created_at,updated_at)
     VALUES ($1,'wechat',$2,now(),0,now(),now()) RETURNING id`,
    [crypto.randomUUID(), OPENID]);
  check('预置 sso-third-party-binding(subscribe=0) 成功', bindIns.rows[0] && bindIns.rows[0].id, `id=${bindIns.rows[0].id}`);

  // ---- admin 登录 ----
  const adminLogin = await waitForServer();
  const adminToken = tokenOf(adminLogin);
  check('admin(1117) 登录拿到 jwt', !!adminToken, JSON.stringify(adminLogin).slice(0, 80));
  if (!adminToken) { console.error('admin 登录失败，终止'); process.exit(1); }

  // ============ 1. GET 接入验证 ============
  {
    const tsq = Date.now(), nonce = 'n123';
    const sig = wxSig(tsq, nonce, TOKEN);
    const g = await api('GET', `/zhao-sso/v1/wechat/callback?signature=${sig}&timestamp=${tsq}&nonce=${nonce}&echostr=echoback`);
    const body = await g.text();
    check('GET 正确验签 返回 echostr=echoback', g.status === 200 && body === 'echoback', `${g.status} body=${body}`);

    const bad = await api('GET', `/zhao-sso/v1/wechat/callback?signature=deadbeef&timestamp=${tsq}&nonce=${nonce}&echostr=echoback`);
    check('GET 错误 signature 返回 403', bad.status === 403, `${bad.status}`);

    const miss = await api('GET', `/zhao-sso/v1/wechat/callback?timestamp=${tsq}&echostr=echoback`);
    check('GET 缺参数 返回 403', miss.status === 403, `${miss.status}`);
  }

  // ============ 2. POST 事件回调 ============
  let subSeq = -1;
  {
    const tsq = Date.now(), nonce = 'nsub';
    const sig = wxSig(tsq, nonce, TOKEN);
    // subscribe + 带参关注(qrscene_)
    const sub = await api('POST', `/zhao-sso/v1/wechat/callback?signature=${sig}&timestamp=${tsq}&nonce=${nonce}`,
      { contentType: 'text/xml; charset=utf-8', rawBody: evXml(OPENID, 'subscribe', 'qrscene_' + sceneKey) });
    const subBody = await sub.text();
    check('POST subscribe 返回 200 且为文本XML', sub.status === 200 && subBody.includes('<xml>'), `${sub.status} ${subBody.slice(0, 80)}`);
    check('subscribe 欢迎语回复含 Content=welcomeReply', subBody.includes('<Content>') && subBody.includes(WELCOME), subBody.slice(0, 120));
    check('欢迎语回复 ToUserName=openid', subBody.includes(`<ToUserName><![CDATA[${OPENID}]]></ToUserName>`), 'openid 回填');
    const evRows = await q(`SELECT * FROM sso_wx_events WHERE openid=$1 ORDER BY id DESC LIMIT 5`, [OPENID]);
    const subEv = evRows.find((e) => e.event === 'subscribe');
    subSeq = subEv ? subEv.id : -1;
    check('subscribe 事件已落库', !!subEv, `count=${evRows.length}`);
    check('落库 scene_key 解析正确', subEv && subEv.scene_key === sceneKey, `scene=${subEv && subEv.scene_key}`);
    check('落库 event_key 为 qrscene_ 前缀', subEv && subEv.event === 'subscribe' && String(subEv.event_key || '').startsWith('qrscene_'), `ek=${subEv && subEv.event_key}`);
    check('绑定的 openid_bound=true', !!subEv && subEv.openid_bound === true, `bound=${subEv && subEv.openid_bound}`);
    const binding = (await q(`SELECT subscribe FROM sso_third_party_bindings WHERE id=$1`, [bindIns.rows[0].id]))[0];
    check('关注事件回填 binding.subscribe=1', binding && Number(binding.subscribe) === 1, `subscribe=${binding && binding.subscribe}`);

    // unsubscribe
    const tsq2 = Date.now(), nonce2 = 'nun';
    const sig2 = wxSig(tsq2, nonce2, TOKEN);
    const un = await api('POST', `/zhao-sso/v1/wechat/callback?signature=${sig2}&timestamp=${tsq2}&nonce=${nonce2}`,
      { contentType: 'text/xml; charset=utf-8', rawBody: evXml(OPENID, 'unsubscribe', '') });
    const unBody = await un.text();
    check('POST unsubscribe 返回 200 且为 success(非订阅不回复欢迎语)', un.status === 200 && unBody === 'success', `${un.status} body=${unBody}`);
    const binding2 = (await q(`SELECT subscribe FROM sso_third_party_bindings WHERE id=$1`, [bindIns.rows[0].id]))[0];
    check('取关事件更新 binding.subscribe=0', binding2 && Number(binding2.subscribe) === 0, `subscribe=${binding2 && binding2.subscribe}`);
    const unEv = (await q(`SELECT id FROM sso_wx_events WHERE openid=$1 AND event='unsubscribe' ORDER BY id DESC LIMIT 1`, [OPENID]))[0];
    check('unsubscribe 事件已落库', !!unEv);

    // text
    const tsq3 = Date.now(), nonce3 = 'nt';
    const sig3 = wxSig(tsq3, nonce3, TOKEN);
    const tx = await api('POST', `/zhao-sso/v1/wechat/callback?signature=${sig3}&timestamp=${tsq3}&nonce=${nonce3}`,
      { contentType: 'text/xml; charset=utf-8', rawBody: textXml(OPENID, 'hello') });
    const txBody = await tx.text();
    check('POST text 返回 200 且为 success', tx.status === 200 && txBody === 'success', `${tx.status} body=${txBody}`);
    const txEv = (await q(`SELECT id FROM sso_wx_events WHERE openid=$1 AND event='text' ORDER BY id DESC LIMIT 1`, [OPENID]))[0];
    check('text 事件已落库', !!txEv);
  }

  // ============ 3. admin 带参二维码 ============
  let qrTemp, qrPerm;
  {
    const r1 = await api('POST', '/zhao-sso/v1/admin/wx/qrcodes', { token: adminToken, body: { scene_key: nm('qt'), title: 'accept临时', kind: 'temporary', expire_seconds: 1800 } });
    qrTemp = r1.json && r1.json.data;
    check('POST /wx/qrcodes 创建 temporary 成功', r1.status === 200 && !!qrTemp && !!qrTemp.id, `${r1.status} ${JSON.stringify(r1.json).slice(0, 100)}`);
    check('temporary 返回 wx_url 含 ticket 前缀 mock_ticket', qrTemp && /showqrcode\?ticket=mock_ticket_/.test(qrTemp.wx_url || ''), `wx=${qrTemp && qrTemp.wx_url}`);

    const r2 = await api('POST', '/zhao-sso/v1/admin/wx/qrcodes', { token: adminToken, body: { scene_key: nm('qp'), title: 'accept永久', kind: 'permanent' } });
    qrPerm = r2.json && r2.json.data;
    check('POST /wx/qrcodes 创建 permanent 成功', r2.status === 200 && !!qrPerm && !!qrPerm.id, `${r2.status} ${JSON.stringify(r2.json).slice(0, 100)}`);
    check('permanent 返回 wx_url 含 ticket', qrPerm && /showqrcode\?ticket=mock_ticket_/.test(qrPerm.wx_url || ''), `wx=${qrPerm && qrPerm.wx_url}`);
    check('temporary.kind=temporary / permanent.kind=permanent', qrTemp && qrTemp.kind === 'temporary' && qrPerm && qrPerm.kind === 'permanent', `t=${qrTemp && qrTemp.kind} p=${qrPerm && qrPerm.kind}`);

    const list = await api('GET', `/zhao-sso/v1/admin/wx/qrcodes?scene_key=${PF}`, { token: adminToken });
    const ldata = list.json && list.json.data;
    check('GET /wx/qrcodes 列表可查(含 2 条测试)', list.status === 200 && Array.isArray(ldata) && ldata.length >= 2, `${list.status} len=${Array.isArray(ldata) ? ldata.length : 'na'}`);

    // 事件日志查询(经 admin /wx/events)
    const evs = await api('GET', `/zhao-sso/v1/admin/wx/events?openid=${PF}`, { token: adminToken });
    const evData = evs.json && evs.json.data;
    check('GET /wx/events 按 openid 前缀可查订阅事件', evs.status === 200 && Array.isArray(evData) && evData.some((e) => e.event === 'subscribe'), `${evs.status} len=${Array.isArray(evData) ? evData.length : 'na'}`);
  }

  // ============ 4. admin 自定义菜单 + 模板 ============
  let menu;
  {
    const r = await api('POST', '/zhao-sso/v1/admin/wx/menus', { token: adminToken, body: { name: nm('menu'), menu_json: { button: [{ type: 'view', name: '测试', url: 'https://a.shenglin.vip' }] } } });
    menu = r.json && r.json.data;
    check('POST /wx/menus 保存成功', r.status === 200 && !!menu && !!menu.id, `${r.status} ${JSON.stringify(r.json).slice(0, 100)}`);
    check('菜单初始 publish_state=local', menu && menu.publish_state === 'local', `st=${menu && menu.publish_state}`);

    const p = await api('POST', `/zhao-sso/v1/admin/wx/menus/${menu.id}/publish`, { token: adminToken });
    const pdata = p.json && p.json.data;
    check('POST /wx/menus/:id/publish 置 published(mock)', p.status === 200 && pdata && pdata.publish_state === 'published', `${p.status} st=${pdata && pdata.publish_state}`);

    const tpl = await api('GET', '/zhao-sso/v1/admin/wx/templates', { token: adminToken });
    const tdata = tpl.json && tpl.json.data;
    check('GET /wx/templates 返回 template_list 数组', tpl.status === 200 && tdata && Array.isArray(tdata.template_list) && tdata.template_list.length > 0, `${tpl.status} len=${tdata && tdata.template_list && tdata.template_list.length}`);

    const rm = await api('GET', '/zhao-sso/v1/admin/wx/menu/remote', { token: adminToken });
    const rmData = rm.json && rm.json.data;
    check('GET /wx/menu/remote 返回 mock 线上菜单信息', rm.status === 200 && rmData && rmData.is_menu_open === 1, `${rm.status} ${JSON.stringify(rmData).slice(0, 80)}`);

    const sc = await api('GET', '/zhao-sso/v1/admin/wx/server-config', { token: adminToken });
    const scData = sc.json && sc.json.data;
    check('GET /wx/server-config 回读 serverToken', sc.status === 200 && scData && scData.token === TOKEN, `token=${scData && scData.token}`);
  }

  // ============ 5. 清理 + 零残留 ============
  // 二进制表优先删
  await client.query(`DELETE FROM sso_wx_events WHERE openid LIKE '${PF}%'`);
  if (qrTemp && qrTemp.id) await client.query(`DELETE FROM sso_wx_qrcodes WHERE id=$1`, [qrTemp.id]);
  if (qrPerm && qrPerm.id) await client.query(`DELETE FROM sso_wx_qrcodes WHERE id=$1`, [qrPerm.id]);
  await client.query(`DELETE FROM sso_wx_qrcodes WHERE scene_key LIKE '${PF}%'`);
  if (menu && menu.id) await client.query(`DELETE FROM sso_wx_menus WHERE id=$1`, [menu.id]);
  await client.query(`DELETE FROM sso_wx_menus WHERE name LIKE '${PF}%'`);
  await client.query(`DELETE FROM sso_third_party_bindings WHERE id=$1`, [bindIns.rows[0].id]);
  await client.query(`DELETE FROM sso_third_party_bindings WHERE provider='wechat' AND provider_user_id LIKE '${PF}%'`);
  await client.query(`DELETE FROM sso_oauth_configs WHERE id=$1`, [cfgIns.rows[0].id]);
  await client.query(`DELETE FROM sso_oauth_configs WHERE name LIKE '${PF}%'`);

  const residue = (await q(`SELECT
      (SELECT count(*)::int FROM sso_oauth_configs WHERE name LIKE '${PF}%') cfg,
      (SELECT count(*)::int FROM sso_wx_events WHERE openid LIKE '${PF}%') ev,
      (SELECT count(*)::int FROM sso_wx_qrcodes WHERE scene_key LIKE '${PF}%') qr,
      (SELECT count(*)::int FROM sso_wx_menus WHERE name LIKE '${PF}%') mu,
      (SELECT count(*)::int FROM sso_third_party_bindings WHERE provider='wechat' AND provider_user_id LIKE '${PF}%') bd`))[0];
  check(`清理完成零残留(cfg=${residue.cfg} ev=${residue.ev} qr=${residue.qr} menu=${residue.mu} bind=${residue.bd})`,
    residue.cfg === 0 && residue.ev === 0 && residue.qr === 0 && residue.mu === 0 && residue.bd === 0);

  await client.end();
  console.log('\n===== 验收结果 =====');
  out.forEach((x) => console.log(x));
  console.log(`PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });