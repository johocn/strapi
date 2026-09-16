const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = 'e:/code/basic';
const status = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' });
const files = status.split('\n').map(l => l.slice(3).trim()).filter(Boolean);

const SECRET_PATTERNS = [
  /__DB_PASSWORD__/,
  /__WECHAT_TOKEN__/,
  /__WECHAT_AES_KEY__/,
  /__ADMIN_PASSWORD__/,
  /__PASSWORD__/,
  /password\s*[:=]\s*['"][^'"]{6,}['"]/,
  /appSecret\s*[:=]\s*['"][^'"]{8,}['"]/,
  /client[_-]?secret\s*[:=]\s*['"][^'"]{8,}['"]/,
  /encodingAESKey\s*[:=]\s*['"][^'"]{8,}['"]/,
  /serverToken\s*[:=]\s*['"][^'"]{8,}['"]/,
  /access[_-]?token\s*[:=]\s*['"][^'"]{16,}['"]/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/,
  /BEGIN (RSA |OPENSSH |EC |)PRIVATE KEY/,
  /mongodb(\+srv)?:\/\/[^\s'"]*:[^\s'"]*@/,
  /postgres(ql)?:\/\/[^\s'"]*:[^\s'"]*@/,
];

const flagged = [];
for (const f of files) {
  if (/\.(png|jpg|jpeg|dump|map)$/i.test(f)) continue;
  const fp = path.join(root, f);
  let content;
  try { content = fs.readFileSync(fp, 'utf8'); } catch { continue; }
  const hits = SECRET_PATTERNS.map((re, i) => re.test(content) ? i : -1).filter(i => i >= 0);
  if (hits.length) flagged.push({ file: f, hits });
}

console.log('TOTAL_UNCOMMITTED:', files.length);
console.log('FLAGGED_SECRET_FILES:', flagged.length);
for (const { file, hits } of flagged) {
  console.log('  [hits:' + hits.join(',') + '] ' + file);
}
