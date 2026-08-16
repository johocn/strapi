const http = require('http');
const https = require('https');
const BASE = 'http://a.shenglin.vip';

function req(method, path, body, token) {
  const data = body ? JSON.stringify(body) : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const lib = BASE.startsWith('https') ? https : http;
  return new Promise((resolve) => {
    const r = lib.request(BASE + path, { method, headers, timeout: 20000 }, (res) => {
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
  let r = await req('POST', '/api/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  const token = r.data && (r.data.token || r.data.jwt || (r.data.data && r.data.data.token));
  if (!token) { console.log('login fail', JSON.stringify(r.data).slice(0, 300)); return; }
  console.log('logged in');

  // up_users (user-roles)
  r = await req('GET', '/api/zhao-auth/v1/admin/users?page=1&pageSize=100', null, token);
  const up = r.data && (r.data.list || (r.data.data && r.data.data.list));
  console.log('=== up_users (count=' + (up ? up.length : '?') + ') ===');
  if (Array.isArray(up)) up.forEach(u => console.log('up id=' + u.id, 'doc=' + u.documentId, 'user=' + u.username, 'email=' + u.email));

  // sso_users
  r = await req('GET', '/api/zhao-sso/v1/admin/users?page=1&pageSize=100', null, token);
  const sso = r.data && (r.data.list || (r.data.data && r.data.data.list) || r.data);
  console.log('=== sso_users (count=' + (sso && sso.length ? sso.length : '?') + ') ===');
  if (Array.isArray(sso)) sso.forEach(s => console.log('sso id=' + s.id, 'doc=' + s.documentId, 'user=' + s.username, 'email=' + s.email, 'mobile=' + s.mobile));
})();