// 净值采集/监察接口冒烟：登录 admin → 监察列表 → 采集配置 → 触发接口签名校验
const BASE = 'http://127.0.0.1:1337/api';

async function call(name, pathname, method = 'GET', token = '', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + pathname, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* not json */ }
  return { status: res.status, json, text };
}

(async () => {
  // 1. 本地登录（多组凭证尝试）
  let token = '';
  for (const cred of [
    { identifier: 'zhao', password: '__PASSWORD__' },
    { identifier: 'admin', password: '__ADMIN_PASSWORD__' },
    { identifier: 'admin', password: '__PASSWORD__' },
  ]) {
    const login = await call('admin login', '/zhao-auth/v1/admin/auth/local', 'POST', '', cred);
    token = login.json?.jwt || login.json?.token || '';
    if (token) {
      console.log('LOGIN OK with', cred.identifier, '/', cred.password.replace(/./g, '*'));
      break;
    }
    console.log('LOGIN FAILED', cred.identifier, login.status, (login.json?.error || '').slice(0, 60));
  }
  if (!token) {
    console.log('ALL LOGINS FAILED');
    process.exit(1);
  }
  console.log('LOGIN OK, token len =', token.length);

  // 2. 监察列表
  const mon = await call('monitor/products', '/zhao-wealth/v1/admin/monitor/products', 'GET', token);
  const monData = mon.json?.data || mon.json || {};
  const summary = monData.summary || {};
  console.log('MONITOR status=' + mon.status, 'summary=', JSON.stringify(summary));
  const list = monData.list || [];
  for (const p of list.slice(0, 20)) {
    console.log(`  [${p.overall}] ${p.id} ${p.productName} nav=${p.latestNav?.navDate || '-'} annual=${p.latestSnapshot?.snapshotDate || '-'} risk=${p.latestMetrics?.snapshotDate || '-'}`);
  }
  console.log('  total products =', list.length);

  // 3. 采集配置
  const cfg = await call('collect-configs', '/zhao-wealth/v1/admin/collect-configs?page=1&pageSize=500', 'GET', token);
  const cfgList = cfg.json?.data?.list || cfg.json?.list || cfg.json?.data || [];
  console.log('CONFIGS status=' + cfg.status, 'count=', Array.isArray(cfgList) ? cfgList.length : '?');
  const statusMap = {};
  for (const c of (Array.isArray(cfgList) ? cfgList : [])) {
    const st = c.collectStatus || 'none';
    statusMap[st] = (statusMap[st] || 0) + 1;
  }
  console.log('  status map =', JSON.stringify(statusMap));

  // 4. 批量触发接口签名（仅校验路由可达性，不真正触发全量任务）
  for (const [name, path, body] of [
    ['collect/trigger', '/zhao-wealth/v1/admin/collect/trigger', { productIds: [] }],
    ['recalculate', '/zhao-wealth/v1/admin/recalculate', { productIds: [] }],
    ['recalculate-risk-metric', '/zhao-wealth/v1/admin/recalculate-risk-metric', { productIds: [], type: 'all' }],
  ]) {
    const r = await call(name, path, 'POST', token, body);
    const msg = r.json?.message || r.json?.error?.message || r.text.slice(0, 200);
    console.log(`POST ${name} status=${r.status} msg=${msg}`);
  }
})();
