const http = require('http');
const https = require('https');
const BASE = 'http://a.shenglin.vip';

function req(method, path, body, token) {
  const data = body ? JSON.stringify(body) : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const lib = BASE.startsWith('https') ? https : http;
  return new Promise((resolve) => {
    const r = lib.request(BASE + path, {
      method,
      headers,
      timeout: 20000,
    }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(d); } catch { parsed = d; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    r.on('error', (e) => resolve({ status: 0, data: 'NET_ERR: ' + e.message }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, data: 'TIMEOUT' }); });
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  // 1. admin 登录
  let r = await req('POST', '/api/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  console.log('login status:', r.status);
  const token = r.data && (r.data.token || r.data.jwt || (r.data.data && r.data.data.token));
  if (!token) {
    console.log('login resp:', JSON.stringify(r.data).slice(0, 500));
    return;
  }
  console.log('got token');

  // 2. 获取用户列表，找第一个有 sso 关联的用户
  r = await req('GET', '/api/zhao-auth/v1/admin/users?page=1&pageSize=5', null, token);
  console.log('users status:', r.status);
  const users = r.data && (r.data.data || (r.data.data && r.data.data.list) || r.data.list);
  console.log('users resp:', JSON.stringify(r.data).slice(0, 600));

  // 3. 获取渠道列表
  r = await req('GET', '/api/zhao-channel/v1/admin/channels?page=1&pageSize=5', null, token);
  console.log('channels status:', r.status);
  const chans = r.data && (r.data.data || (r.data.data && r.data.data.list) || r.data.list);
  console.log('channels resp:', JSON.stringify(r.data).slice(0, 600));

  // 4. 尝试发放积分给第一个用户
  if (users && users.length && chans && chans.length) {
    const u = Array.isArray(users) ? users[0] : (users.list ? users.list[0] : Object.values(users)[0]);
    const c = Array.isArray(chans) ? chans[0] : (chans.list ? chans.list[0] : Object.values(chans)[0]);
    const uid = u.id || u.documentId;
    const cid = c.documentId || c.id;
    console.log('grant target uid=', uid, 'cid=', cid);
    r = await req('POST', '/api/zhao-point/v1/admin/point-records/admin-adjust',
      { userId: uid, points: 10, channelId: cid, remark: '生产测试' }, token);
    console.log('GRANT status:', r.status);
    console.log('GRANT resp:', JSON.stringify(r.data).slice(0, 800));
  }
})();