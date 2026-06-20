const fs = require('fs');
const path = require('path');

const plugins = ['zhao-channel', 'zhao-auth', 'zhao-common', 'zhao-third', 'zhao-course'];
let allOk = true;

plugins.forEach(p => {
  const f = path.join('E:/code/plugins', p, 'package.json');
  try {
    const buf = fs.readFileSync(f);
    const hasBom = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
    const content = buf.toString('utf-8');
    JSON.parse(content);
    const result = p + ': OK (BOM=' + hasBom + ' size=' + buf.length + ')';
    fs.appendFileSync('E:/code/plugins/zhao-course/scripts/test_result.txt', result + '\n');
    console.log(result);
  } catch (e) {
    const result = p + ': ERROR - ' + e.message;
    fs.appendFileSync('E:/code/plugins/zhao-course/scripts/test_result.txt', result + '\n');
    console.log(result);
    allOk = false;
  }
});

if (allOk) {
  console.log('全部正常，可以尝试构建');
} else {
  console.log('仍有问题需要修复');
}
