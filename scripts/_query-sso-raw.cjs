const http = require('http');
const BASE = 'http://a.shenglin.vip';
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
(async () => {
  let r = await req('POST', '/api/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  const token = r.data && (r.data.token || r.data.jwt || (r.data.data && r.data.data.token));
  if (!token) { console.log('login fail'); return; }
  // 原始 sso users 响应
  r = await req('GET', '/api/zhao-sso/v1/admin/users?page=1&pageSize=100', null, token);
  console.log('SSO users status:', r.status, 'raw:', JSON.stringify(r.data).slice(0, 1500));
})();