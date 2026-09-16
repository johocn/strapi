// 带 x-site-id 模拟真实前端请求，找出 dashboard 报错接口
const fs = require('fs');
const jwt = require('/www/apps/strapi/node_modules/jsonwebtoken');

const env = fs.readFileSync('/www/apps/strapi/.env', 'utf8');
const secret = (env.match(/^JWT_SECRET=(.*)$/m) || [])[1];
const token = jwt.sign({ id: 1, username: 'admin', email: 'admin@local' }, secret, { expiresIn: '1h' });
const BASE = 'http://127.0.0.1:1337/api';
const SITE = 'drxb4lxprzdoyj6tj667wpvb';

async function probe(name, pathname, opts = {}) {
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  if (opts.siteId !== false) headers['x-site-id'] = SITE;
  try {
    const res = await fetch(BASE + pathname, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const text = await res.text();
    console.log(`[${res.status}] ${name} ${pathname}${opts.method ? ' ' + opts.method : ''}`);
    if (res.status >= 400) console.log('   ERR:', text.slice(0, 500));
    return res.status;
  } catch (e) {
    console.log(`[ERR] ${name} ${pathname} :: ${e.message}`);
  }
}

(async () => {
  // dashboard loadStats 的 10 个接口 + 认证接口
  await probe('permission-keys', '/zhao-auth/v1/my/permission-keys');
  await probe('roles', '/zhao-auth/v1/my/roles');
  await probe('tenants', '/zhao-auth/v1/my/tenants');
  await probe('channel-scope', '/zhao-auth/v1/my/channel-scope');
  await probe('admin channels', '/zhao-channel/v1/admin/channels?pagination[pageSize]=1');
  await probe('courses', '/zhao-course/v1/admin/courses?pagination[pageSize]=1&fields[0]=status');
  await probe('questions', '/zhao-quiz/v1/admin/questions?pagination[pageSize]=1');
  await probe('point records', '/zhao-point/v1/admin/records?pagination[pageSize]=1');
  await probe('user courses', '/zhao-course/v1/admin/enrollments?pagination[pageSize]=1');
  await probe('course progress', '/zhao-course/v1/admin/lesson-progress?pagination[pageSize]=5');
  await probe('articles', '/zhao-website/v1/admin/articles?pagination[pageSize]=1');
  await probe('products', '/zhao-website/v1/admin/products?pagination[pageSize]=1');
  await probe('cases', '/zhao-website/v1/admin/cases?pagination[pageSize]=1');
  await probe('leads', '/zhao-website/v1/admin/leads?pagination[pageSize]=1');
  await probe('config shenglin', '/zhao-common/v1/public/config?siteId=' + SITE, { siteId: false });
  await probe('config default', '/zhao-common/v1/public/config', { siteId: false });
})();
