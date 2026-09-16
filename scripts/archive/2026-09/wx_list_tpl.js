const https = require('https');
const APPID = 'wx17d58d73062d1899';
const SECRET = 'e745b67711ec9c11d9eca00b582c37ee';
function get(url) { return new Promise((res, rej) => { https.get(url, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))).on('error',rej); }).on('error', rej); }); }
(async () => {
  const t = await get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`);
  console.log('TOKEN', t.errcode || 'ok', t.errmsg || '');
  const list = await get(`https://api.weixin.qq.com/cgi-bin/template/get_all_private_template?access_token=${t.access_token}`);
  console.log('LIST', JSON.stringify(list));
})();