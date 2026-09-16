// 用真实登录接口探测 admin 登录态（h.joho.cn 后台登录流程）
const fs = require('fs');

const BASE = 'http://127.0.0.1:1337/api';

async function call(name, pathname, method = 'GET', body = null) {
  try {
    const res = await fetch(BASE + pathname, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    console.log(`\n===== ${name} [${res.status}] ${method} ${pathname}`);
    console.log(text.slice(0, 1200));
    return { status: res.status, text };
  } catch (e) {
    console.log(`\n===== ${name} ERR ${pathname} :: ${e.message}`);
    return { status: -1, text: e.message };
  }
}

(async () => {
  // 1. 本地登录（web 目录 adminLogin 流程）
  const login = await call('admin login', '/zhao-auth/v1/admin/auth/local', 'POST', { identifier: 'admin', password: '__PASSWORD__' });
  let token = '';
  try {
    const d = JSON.parse(login.text);
    token = d?.jwt || d?.token || '';
    if (!token) console.log('LOGIN FAILED:', login.text.slice(0, 400));
  } catch (e) { /* not json */ }

  if (token) {
    const H = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
    // 2. 带认证的核心接口
    for (const [n, p] of [
      ['my roles', '/zhao-auth/v1/my/roles'],
      ['my permission-keys', '/zhao-auth/v1/my/permission-keys'],
      ['my channel-scope', '/zhao-auth/v1/my/channel-scope'],
      ['my tenants', '/zhao-auth/v1/my/tenants'],
      ['switch-tenant', '/zhao-auth/v1/auth/switch-tenant'],
    ]) {
      const opts = { method: n.includes('switch') ? 'POST' : 'GET', headers: H, body: n.includes('switch') ? JSON.stringify({ tenantId: 'drxb4lxprzdoyj6tj667wpvb' }) : undefined };
      const res = await fetch(BASE + p, opts);
      const text = await res.text();
      console.log(`\n===== ${n} [${res.status}]`);
      console.log(text.slice(0, 800));
    }
  }
})();
