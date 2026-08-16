const BASE = 'http://localhost:1337/api';

async function req(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const resp = await fetch(BASE + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await resp.json(); } catch {}
  return { status: resp.status, data };
}

(async () => {
  // 1. admin 登录获取 token（走 admin 本地登录，绕过 SSO）
  let r = await req('POST', '/zhao-auth/v1/admin/auth/local', { identifier: 'admin', password: 'Admin@12345' });
  console.log('login status:', r.status);
  const token = r.data?.jwt || r.data?.token || r.data?.data;
  if (!token) { console.log('login resp:', JSON.stringify(r.data)); return; }
  console.log('got token');
  const auth = typeof token === 'string' ? token : token.jwt;

  // 2. 需要渠道 scope。先查当前 admin 的渠道列表
  r = await req('GET', '/zhao-channel/v1/my/channels?pageSize=200', null, auth);
  console.log('channels status:', r.status, JSON.stringify(r.data).slice(0, 300));
  let channelId = null;
  const list = r.data?.list || r.data?.data || r.data?.results || (Array.isArray(r.data) ? r.data : []);
  if (list && list.length) {
    channelId = list[0].documentId || list[0].id;
    console.log('using channel:', channelId);
  }

  // 3. 发放给有 sso 关联的用户 up_users.id=2 (shao)
  r = await req('POST', '/zhao-point/v1/admin/point-records/admin-adjust', {
    userId: 2, points: 10, channelId, remark: '测试发放'
  }, auth);
  console.log('grant shao(up_id=2) status:', r.status, JSON.stringify(r.data));

  // 4. 发放给无 sso 关联的用户 up_users.id=6 (testuser888)
  r = await req('POST', '/zhao-point/v1/admin/point-records/admin-adjust', {
    userId: 6, points: 10, channelId, remark: '测试发放'
  }, auth);
  console.log('grant testuser888(up_id=6) status:', r.status, JSON.stringify(r.data));
})().catch(e => { console.error('ERROR:', e); process.exit(1); });