const fs = require('fs');
const path = require('path');

const dir = 'e:/code/basic/scripts/archive/2026-09';

const SECRET_PATTERNS = [
  [/__DB_PASSWORD__/, 'DB密码'],
  [/__WECHAT_TOKEN__/, '微信Token'],
  [/__WECHAT_AES_KEY__/, '微信AESKey'],
  [/__ADMIN_PASSWORD__/, 'Admin密码'],
  [/__PASSWORD__/, '密码'],
  [/__ADMIN_PASSWORD__/, 'Admin密码'],
  [/password\s*[:=]\s*['"](?!__)([^'"]{6,})['"]/, 'password字面量'],
  [/appSecret\s*[:=]\s*['"](?!__)[^'"]{8,}['"]/, 'appSecret'],
  [/client[_-]?secret\s*[:=]\s*['"](?!__)[^'"]{8,}['"]/, 'client_secret'],
  [/encodingAESKey\s*[:=]\s*['"](?!__)[^'"]{8,}['"]/, 'AESKey'],
  [/serverToken\s*[:=]\s*['"](?!__)[^'"]{8,}['"]/, 'serverToken'],
  [/access[_-]?token\s*[:=]\s*['"](?!__)[^'"]{16,}['"]/, 'access_token'],
  [/Bearer\s+[A-Za-z0-9._-]{20,}/, 'Bearer'],
  [/BEGIN (RSA |OPENSSH |EC |)PRIVATE KEY/, '私钥'],
  [/mongodb(\+srv)?:\/\/[^\s'"]*:[^\s'"]*@/, 'mongo带密'],
  [/postgres(ql)?:\/\/[^\s'"]*:[^\s'"]*@/, 'pg带密'],
];

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const files = walk(dir);
let flagged = 0;
for (const f of files) {
  let c;
  try { c = fs.readFileSync(f, 'utf8'); } catch { continue; }
  for (const [re, label] of SECRET_PATTERNS) {
    if (re.test(c)) {
      console.log(`!! [${label}] ${path.relative('e:/code/basic', f)}`);
      flagged++;
      break;
    }
  }
}
console.log('FILES_SCANNED:', files.length, 'FLAGGED:', flagged);
