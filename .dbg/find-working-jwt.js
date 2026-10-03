const http = require('http');

function curl(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:1337');
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    req.end();
  });
}

(async () => {
  console.log('\n===== Try zhao-auth login =====\n');

  // Try various zhao-auth login endpoints
  const tests = [
    ['POST', '/api/auth/local', { identifier: '1117', password: 'Test123456!' }],
    ['POST', '/api/auth/local', { identifier: '1117', password: 'Admin123!' }],
    ['POST', '/api/auth/local', { identifier: '1117@163.com', password: 'Test123456!' }],
    ['POST', '/api/auth/login', { identifier: '1117', password: 'Test123456!' }],
    ['POST', '/api/auth/login', { username: '1117', password: 'Test123456!' }],
    ['POST', '/api/auth/login', { email: '1117@163.com', password: 'Test123456!' }],
  ];

  for (const [method, path, body] of tests) {
    const r = await curl(path, { method, body });
    const ok = r.body?.jwt || r.body?.token;
    console.log(`${method} ${path} ${JSON.stringify(body).slice(0, 50)} => ${r.status} ${ok ? 'HAS JWT' : JSON.stringify(r.body).slice(0, 100)}`);
    if (ok) {
      console.log('GOT JWT:', r.body.jwt?.slice(0, 30) || r.body.token?.slice(0, 30));
      
      // Test one OAuth API
      const h = { Authorization: `Bearer ${r.body.jwt || r.body.token}` };
      const check = await curl('/api/zhao-studio/v1/admin/platforms', { headers: h });
      console.log('  With this JWT, platforms =>', check.status);
      
      if (check.status < 400) {
        console.log('  THIS JWT WORKS!');
      }
    }
  }
})();
