const http = require('http');
const BASE = 'http://127.0.0.1:1337';
function req(method, path, body, token) {
  const data = body ? JSON.stringify(body) : null;
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return new Promise((resolve) => {
    const r = http.request(BASE + path, { method, headers: h, timeout: 20000 }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
      res.on('end', () => { let p = null; try { p = JSON.parse(d); } catch { p = d; } resolve({ status: res.statusCode, data: p }); });
    });
    r.on('error', (e) => resolve({ status: 0, data: 'NET_ERR: ' + e.message }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, data: 'TIMEOUT' }); });
    if (data) r.write(data); r.end();
  });
}
const ok = (name, cond, extra='') => console.log((cond?'PASS':'FAIL')+' | '+name+(extra?' | '+extra:''));
(async () => {
  // 1. 登录（zhao-auth 管理员兼容 sso admin）
  let r = await req('POST', '/api/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  const token = r.data && (r.data.token || r.data.jwt || (r.data.data && r.data.data.token));
  ok('zhao-auth admin 登录', !!token, `status=${r.status}`);
  if (!token) return;

  // 2. 建模板
  const code = 'evt_remind_test_' + Date.now();
  r = await req('POST', '/api/zhao-sso/v1/admin/msg-templates', {
    code, name: '测试活动提醒', provider: 'wechat',
    wxTemplateId: 'T0001_TEST', wxTemplateFields: [{name:'thing1',key:'eventName'},{name:'date2',key:'time'},{name:'thing3',key:'venue'}],
    isEnabled: true, content: '测试模板 {eventName} {time} {venue}'
  }, token);
  const tmpl = r.data && (r.data.data || r.data);
  ok('创建 msg-template', r.status === 200 && !!tmpl && tmpl.code === code, `status=${r.status}`);
  const tmplId = tmpl && (tmpl.id || tmpl.documentId);

  // 3. 列表模板
  r = await req('GET', '/api/zhao-sso/v1/admin/msg-templates?page=1&pageSize=5', null, token);
  const tlist = r.data && r.data.data;
  ok('列表 msg-templates 含新建', r.status===200 && Array.isArray(tlist) && tlist.some(t=>t.code===code));

  // 4. 给一个真实 sso 用户建 job（拿用户列表第一个）
  r = await req('GET', '/api/zhao-sso/v1/admin/users?page=1&pageSize=5', null, token);
  const users = r.data && r.data.data;
  const uid = (Array.isArray(users) && users[0]) ? (users[0].id||users[0].documentId) : null;
  ok('读取 sso 用户列表(供测试)', !!uid, uid ? '' : '无用户');

  // 5. buildJob + sendNow（mock 或真实）
  if (uid) {
    r = await req('POST', '/api/zhao-sso/v1/admin/msg-jobs/anonymous', {
      userId: uid, scene: 'evt_remind', templateCode: code, params: { eventName:'产品发布会', time:'2026-08-25 14:00', venue:'上海中心' }, link: 'https://a.shenglin.vip'
    }, token);
    const job = r.data && r.data.data;
    ok('发送 msg-job(mock/真实)', r.status===200 && !!job, `status=${r.status} job.status=${job&&job.status} msg=${job&&job.result&&job.result.message||''}`);
    if (job) {
      ok('job 进入终态', ['sent','failed'].includes(job.status), `status=${job.status}`);
    }
  }

  // 6. 清理测试模板
  if (tmplId) {
    r = await req('DELETE', '/api/zhao-sso/v1/admin/msg-templates/' + tmplId, null, token);
    ok('删除 msg-template', r.status === 200);
  }
})();