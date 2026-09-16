#!/usr/bin/env node
// 微信回调 verify 自检：模拟微信公众号在配置服务器时发起的 GET 校验请求
// URL: /api/zhao-sso/v1/wechat/callback?signature=xxx&timestamp=xxx&nonce=xxx&echostr=xxx
const crypto = require('crypto');
const http = require('http');
const { Client } = require('/www/apps/strapi/node_modules/pg');

const DB = { host: '127.0.0.1', port: 5432, database: 'strapi', user: 'strapi', password: '__DB_PASSWORD__', ssl: false };
const TOKEN_WE_ENTERED = '__WECHAT_TOKEN__'; // 我们在 extra_config.token 填的
const HOST = '127.0.0.1';
const PORT = 1337; // strapi 端口需确认

function sign(token, timestamp, nonce) {
  const sorted = [token, String(timestamp), String(nonce)].sort().join('');
  return crypto.createHash('sha1').update(sorted).digest('hex');
}

(async () => {
  const c = await new Client(DB).connect();
  const cfg = await c.query(`SELECT extra_config FROM sso_oauth_configs WHERE provider='wechat' AND app_type='official_account'`);
  const ec = cfg.rows[0].extra_config || {};
  console.log('DB extra_config keys:', Object.keys(ec));
  console.log('has serverToken?', !!ec.serverToken, '| has token?', !!ec.token);
  await c.end();

  // 确认 strapi 端口
  console.log('strapi port assumed:', PORT);

  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.floor(Math.random() * 1e10).toString();
  // 用数据库读到的 token 计算签名（真实自检）
  const useToken = ec.serverToken || ec.token;
  const sig = sign(useToken, ts, nonce);
  const echostr = 'CHECK_OK_' + Date.now();

  const url = `/api/zhao-sso/v1/wechat/callback?signature=${sig}&timestamp=${ts}&nonce=${nonce}&echostr=${encodeURIComponent(echostr)}`;
  console.log('GET', url);

  const req = http.request({ host: HOST, port: PORT, path: url, method: 'GET' }, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      console.log('HTTP_STATUS', res.statusCode);
      console.log('RESPONSE_BODY', JSON.stringify(body));
      console.log('EXPECT_ECHOSTR', echostr);
      const pass = res.statusCode === 200 && body === echostr;
      console.log('VERIFY_RESULT', pass ? 'PASS' : 'FAIL');
      process.exit(0);
    });
  });
  req.on('error', e => { console.error('REQ_ERR', e.message); process.exit(1); });
  req.end();
})();