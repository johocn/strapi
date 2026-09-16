// 冒烟跟进：打印采集配置原始响应 → 等待队列执行 → 复查监察状态
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
  const login = await call('admin login', '/zhao-auth/v1/admin/auth/local', 'POST', '', { identifier: 'zhao', password: '__PASSWORD__' });
  const token = login.json?.jwt || login.json?.token || '';
  if (!token) { console.log('LOGIN FAILED', login.status); process.exit(1); }

  // 1. 采集配置原始响应
  const cfg = await call('collect-configs', '/zhao-wealth/v1/admin/collect-configs?page=1&pageSize=500', 'GET', token);
  console.log('CONFIGS RAW status=' + cfg.status, cfg.text.slice(0, 1500));

  // 2. 等待队列执行
  console.log('waiting 50s for queue jobs...');
  await new Promise((r) => setTimeout(r, 50000));

  // 3. 复查监察状态
  const mon = await call('monitor/products', '/zhao-wealth/v1/admin/monitor/products', 'GET', token);
  const monData = mon.json?.data || mon.json || {};
  console.log('MONITOR-AFTER status=' + mon.status, 'summary=', JSON.stringify(monData.summary || {}));
  for (const p of (monData.list || [])) {
    console.log(`  [${p.overall}] ${p.id} ${p.productName} nav=${p.latestNav?.navDate || '-'} annual=${p.latestSnapshot?.snapshotDate || '-'} risk=${p.latestMetrics?.snapshotDate || '-'} riskDaysBehind=${p.navDaysBehind ?? '-'}`);
  }
})();
