// 验证还原结果：id2 余额 + 剧本进度
const fs = require('fs');
const path = require('path');
const STRAPI_DIR = process.env.STRAPI_DIR || '/www/apps/strapi';
const US = Number(process.env.US || 2);
const TOUR_DOC = process.env.TOUR_DOC || '4f9575ee7904198ea53678836ad4c05e';
function envV(k,f=''){try{const m=fs.readFileSync(path.join(STRAPI_DIR,'.env'),'utf8').match(new RegExp('^'+k+'=(.*)$','m'));return m?m[1].trim():f;}catch{return f;}}
(async()=>{
  const jwt = require(path.join(STRAPI_DIR,'node_modules','jsonwebtoken'));
  const token = jwt.sign({id:US}, envV('JWT_SECRET'), {expiresIn:'2h'});
  const H={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  const B='http://localhost:1337/api/zhao-point/v1';
  const bal = await (await fetch(`${B}/my/point/balance`,{headers:H})).json();
  console.log('BALANCE:', JSON.stringify(bal));
  const st = await (await fetch(`${B}/my/activity/${TOUR_DOC}/tour/story`,{headers:H})).json();
  console.log('TOUR_PROGRESS:', JSON.stringify(st?.data?.progress ?? st?.progress ?? st));
  const rec = await (await fetch(`${B}/my/point/records?pageSize=50`,{headers:H})).json();
  const list = rec?.data?.records ?? rec?.records ?? rec?.data ?? [];
  const tour = list.filter(r=>/^tour_/.test(r.action||''));
  console.log('REMAINING_TOUR_RECORDS:', tour.length);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});