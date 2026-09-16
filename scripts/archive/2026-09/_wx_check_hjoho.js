#!/usr/bin/env node
const crypto = require('crypto');
const https = require('https');
const TOKEN = '__WECHAT_TOKEN__';
function sign(t){const a=[TOKEN,String(t.ts),String(t.nonce)].sort().join('');return crypto.createHash('sha1').update(a).digest('hex');}
const ts = Math.floor(Date.now()/1000).toString();
const nonce = Math.floor(Math.random()*1e10).toString();
const sig = sign({ts,nonce});
const echostr = 'HJOHO_' + Date.now();
const path = `/api/zhao-sso/v1/wechat/callback?signature=${sig}&timestamp=${ts}&nonce=${nonce}&echostr=${echostr}`;
console.log('HTTPS GET https://h.joho.cn' + path);
const req = https.request({ host:'h.joho.cn', port:443, path, method:'GET' }, (res) => {
  let b=''; res.on('data',d=>b+=d); res.on('end',()=>{
    console.log('STATUS', res.statusCode);
    console.log('BODY', JSON.stringify(b));
    console.log('VERIFY', (res.statusCode===200 && b===echostr) ? 'PASS' : 'FAIL');
    process.exit(0);
  });
});
req.on('error',e=>{console.error('REQ_ERR',e.message);process.exit(1);});
req.end();