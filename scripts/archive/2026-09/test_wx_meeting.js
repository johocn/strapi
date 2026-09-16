#!/usr/bin/env node
// 手动实测：直接调用微信模板消息接口，向赵义涛 openid 发送「会议报名成功通知」(EBB10k)
// 运行：cd /www/apps/strapi && node test_wx_meeting.js
const https = require('https');
const APPID = 'wx17d58d73062d1899';
const SECRET = process.env.WX_SECRET || 'e745b67711ec9c11d9eca00b582c37ee';

function postTo(url, body) {
  return new Promise((res, rej) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (r) => {
      let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d))).on('error', rej);
    }); req.on('error', rej); req.write(data); req.end();
  });
}
function getUrl(url) { return new Promise((res, rej) => { https.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d))).on('error', rej); }).on('error', rej); }); }

(async () => {
  const t = await getUrl(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`);
  console.log('TOKEN', t.errcode || 'ok', t.errmsg || '');
  if (t.errcode) { process.exit(1); }
  const openid = 'oUl0rxCSxrhkp0__n7-XkwEFJpD0';
  const r = await postTo(`https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${t.access_token}`, {
    touser: openid,
    template_id: 'EBB10k3Lpl-u8su8dFeK5Y_E8F88hn93FTzhtXeAsgQ',
    url: 'https://h.joho.cn',
    data: {
      thing2: { value: '索能达-施耐德配电产品交流会' },
      thing4: { value: '苏州凯悦酒店' },
      time6: { value: '2022-12-12 14:00~12-14 12:30' },
    },
  });
  console.log('SEND', JSON.stringify(r));
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });