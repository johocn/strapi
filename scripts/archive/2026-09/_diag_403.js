#!/usr/bin/env node
// 复现公网 403：分开几步诊断
// 1) 本地 1337 直连（应 PASS）2) 试 https 域名但不经 https 模块的自动解析，用 curl
const { execSync } = require('child_process');
const ts = Math.floor(Date.now()/1000).toString();
const nonce = Math.floor(Math.random()*1e10).toString();
const TOKEN='__WECHAT_TOKEN__';
function sha1(s){const crypto=require('crypto');return crypto.createHash('sha1').update(s).digest('hex');}
const sig = sha1([TOKEN,ts,nonce].sort().join(''));
const echostr='DIAG_'+Date.now();
const q = `signature=${sig}&timestamp=${ts}&nonce=${nonce}&echostr=${echostr}`;
// 本地 1337
try { const out=execSync(`curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:1337/api/zhao-sso/v1/wechat/callback?${q}"`).toString(); console.log('LOCAL1337_CODE', out.trim()); } catch(e){ console.log('LOCAL1337_ERR', e.message); }
// 公网 https
try { const out=execSync(`curl -s -o /dev/null -w "%{http_code}" "https://v.joho.cn/api/zhao-sso/v1/wechat/callback?${q}"`).toString(); console.log('PUBLIC_HTTPS_CODE', out.trim()); } catch(e){ console.log('PUBLIC_ERR', e.message); }
// 公网 http (80) 看我方 nginx 80 行为
try { const out=execSync(`curl -sL -o /dev/null -w "%{http_code}" "http://v.joho.cn/api/zhao-sso/v1/wechat/callback?${q}"`).toString(); console.log('PUBLIC_HTTP_CODE', out.trim()); } catch(e){ console.log('PUBLIC_HTTP_ERR', e.message); }
console.log('SIG', sig, 'TS', ts, 'NONCE', nonce);