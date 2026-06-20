const fs = require('fs');
const plugins = ['zhao-channel', 'zhao-auth', 'zhao-common', 'zhao-third', 'zhao-course'];
let anyFixed = false;
plugins.forEach(p => {
  const f = 'E:/code/plugins/' + p + '/package.json';
  const buf = fs.readFileSync(f);
  const hasBom = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  if (hasBom) {
    const str = buf.toString('utf-8');
    fs.writeFileSync(f, str.slice(1), 'utf-8');
    console.log('FIXED BOM: ' + p);
    anyFixed = true;
  } else {
    console.log('OK: ' + p + ' (no BOM)');
  }
});
console.log(anyFixed ? '已修复BOM问题' : '所有文件正常');
