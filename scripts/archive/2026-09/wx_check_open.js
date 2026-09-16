const https = require('https');
const APPID = 'wx17d58d73062d1899';
const SECRET = 'e745b67711ec9c11d9eca00b582c37ee';
const OPEN = ['oUl0rxCSxrhkp0__n7-XkwEFJpD0'];
function get(url) { return new Promise((res, rej) => { https.get(url, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))).on('error',rej); }).on('error', rej); }); }
(async () => {
  const t = await get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`);
  for (const o of OPEN) {
    const u = await get(`https://api.weixin.qq.com/cgi-bin/user/info?access_token=${t.access_token}&openid=${o}`);
    console.log('OPEN', o, JSON.stringify({subscribe: u.subscribe, nickname: u.nickname, errcode: u.errcode, errmsg: u.errmsg}));
  }
})();