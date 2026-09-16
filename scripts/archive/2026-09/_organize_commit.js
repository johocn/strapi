const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = 'e:/code/basic';
const ARCHIVE = path.join(root, 'scripts/archive/2026-09');
const status = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' });

// 解析未跟踪文件
const untracked = status.split('\n')
  .map(l => l.trim())
  .filter(l => l.startsWith('??'))
  .map(l => l.slice(2).trim())
  .filter(Boolean);

// 排除清单：含凭据 + 敏感 + 临时 + 构建产物
const EXCLUDE = new Set([
  // 根目录含凭据脚本（扫描命中）
  '_add_server_token.js', '_check_token_db.js', '_clean_extraconfig.js',
  '_diag_403.js', '_diag_extraconfig.js', '_dump_oauth2.js',
  '_fill_oauth_creds.js', '_fix_oauth_service.js', '_fix_serverToken.js',
  '_prep_oauth_insert.js', '_restore_links.js', '_restore_oauth.js',
  '_restore_sites.js', '_verify_after_clean.js', '_wx_check_hjoho.js',
  '_wx_public_check.js', '_wx_verify_check.js',
  // scripts/ 含凭据脚本
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
  // 敏感/临时/产物
  'sso_backup_20260903_161128.dump',
  'scripts/_admin_token.txt',
  '.commitmsg.tmp',
  '.trae/',
  'plugins/zhao-website/server/src/services/utils/.build/',
]);

// 特殊处理：文档类（不归档，移/docs 或原地）
const DOCS_MOVE = {
  'scripts/2026-08-30-数据清理与账号对齐操作报告.md': 'docs/2026-08-30-数据清理与账号对齐操作报告.md',
};

fs.mkdirSync(ARCHIVE, { recursive: true });
const moved = [], deleted = [], skipped = [];

for (const f of untracked) {
  const abs = path.join(root, f);
  let stat;
  try { stat = fs.statSync(abs); } catch { skipped.push(f + ' (not found)'); continue; }

  if (EXCLUDE.has(f) || EXCLUDE.has(f.replace(/\/$/, ''))) { skipped.push(f + ' (EXCLUDE)'); continue; }

  if (/\.png$/i.test(f)) {
    fs.unlinkSync(abs);
    deleted.push(f);
    continue;
  }
  if (DOCS_MOVE[f]) {
    fs.mkdirSync(path.dirname(path.join(root, DOCS_MOVE[f])), { recursive: true });
    fs.renameSync(abs, path.join(root, DOCS_MOVE[f]));
    moved.push(f + ' -> ' + DOCS_MOVE[f]);
    continue;
  }
  // 文档类原地保留（plans 已在正确位置）
  if (/\.md$/i.test(f)) { moved.push(f + ' (keep in place)'); continue; }

  // 归档：根目录散落文件与 scripts/ 下临时脚本统一进 archive
  const base = path.basename(f);
  const dest = path.join(ARCHIVE, base);
  if (fs.existsSync(dest)) {
    skipped.push(f + ' (name conflict at ' + dest + ')');
    continue;
  }
  fs.renameSync(abs, dest);
  moved.push(f + ' -> scripts/archive/2026-09/' + base);
}

console.log('MOVED:', moved.length);
moved.forEach(x => console.log('  ' + x));
console.log('DELETED_PNG:', deleted.length);
deleted.forEach(x => console.log('  ' + x));
console.log('SKIPPED:', skipped.length);
skipped.forEach(x => console.log('  ' + x));
