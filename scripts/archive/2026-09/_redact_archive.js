const fs = require('fs');
const path = require('path');

const root = 'e:/code/basic';
const ARCHIVE = path.join(root, 'scripts/archive/2026-09');

// 待脱敏文件（49 个含凭据脚本，来自精确扫描结果）
const TARGETS = [
  // 根目录
  '_add_server_token.js', '_check_token_db.js', '_clean_extraconfig.js',
  '_diag_403.js', '_diag_extraconfig.js', '_dump_oauth2.js',
  '_fill_oauth_creds.js', '_fix_oauth_service.js', '_fix_serverToken.js',
  '_prep_oauth_insert.js', '_restore_links.js', '_restore_oauth.js',
  '_restore_sites.js', '_verify_after_clean.js', '_wx_check_hjoho.js',
  '_wx_public_check.js', '_wx_verify_check.js',
  // scripts/
  'scripts/_deploy_zcommon.sh', 'scripts/_diag_login.sh',
  'scripts/_diag_permkeys.sh', 'scripts/_diag_quiz_403.sh',
  'scripts/_diag_sso_roles.sh', 'scripts/_gen_ai_summary.js',
  'scripts/_gen_hash.sh', 'scripts/_probe_admin_login.js',
  'scripts/_probe_admin_perm.sh', 'scripts/_probe_pages.js',
  'scripts/_repro_admin_login.sh', 'scripts/_scan_secrets.js',
  'scripts/_set_id2_admin.sh', 'scripts/_smoke_wealth_api.js',
  'scripts/_smoke_wealth_followup.js', 'scripts/_ui_api_probe.js',
  'scripts/_ui_capture.js', 'scripts/_ui_probe.js',
  'scripts/_ui_puttest.js', 'scripts/_ui_verify.js',
  'scripts/_verify_admin_scope.sh', 'scripts/_verify_ai_summary.js',
  'scripts/_verify_gen.js', 'scripts/_verify_kg_edit.js',
  'scripts/_verify_login.sh', 'scripts/_verify_ningyin_final.mjs',
  'scripts/_verify_ningyin_prod.mjs', 'scripts/_verify_online.sh',
  'scripts/_verify_quiz_scope.sh', 'scripts/_verify_ui_pages.js',
  'scripts/_walk_wealth_hall.js', 'scripts/_walk_wealth_login.js',
];

// 精确凭据值 → 占位符
const EXACT = [
  ['__DB_PASSWORD__', '__DB_PASSWORD__'],
  ['__WECHAT_TOKEN__', '__WECHAT_TOKEN__'],
  ['__WECHAT_AES_KEY__', '__WECHAT_AES_KEY__'],
  ['__ADMIN_PASSWORD__', '__ADMIN_PASSWORD__'],
  ['__PASSWORD__', '__PASSWORD__'],
  ['__ADMIN_PASSWORD__', '__ADMIN_PASSWORD__'],
];

// 通用：凭据字段的值（引号内、非占位符、长度>=6）→ __REDACTED__
const FIELD = /(password|passwd|appSecret|client_secret|clientSecret|serverToken|access_token|accessToken|refresh_token|token|secret|encodingAESKey|serverToken)\s*[:=]\s*(['"])(?!__)([^'"]{6,})\2/g;

function redact(content) {
  for (const [from, to] of EXACT) {
    content = content.split(from).join(to);
  }
  content = content.replace(FIELD, (m, key, q, val) => `${key}=${q}__REDACTED__${q}`);
  return content;
}

const report = [];
for (const rel of TARGETS) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) { report.push('MISS ' + rel); continue; }
  let raw = fs.readFileSync(abs, 'utf8');
  const before = raw;
  const out = redact(raw);
  if (before === out) { report.push('NOCHANGE ' + rel); continue; }
  fs.writeFileSync(abs, out, 'utf8');
  report.push('REDACTED ' + rel);
}
console.log(report.join('\n'));

// 移动到归档
const moved = [];
for (const rel of TARGETS) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const base = path.basename(rel);
  const dest = path.join(ARCHIVE, base);
  if (fs.existsSync(dest)) { console.log('CONFLICT ' + rel); continue; }
  fs.renameSync(abs, dest);
  moved.push(base);
}
console.log('\nMOVED_TO_ARCHIVE:', moved.length);
