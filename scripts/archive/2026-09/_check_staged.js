const { execSync } = require('child_process');
const root = 'e:/code/basic';
const staged = execSync('git diff --cached --name-only', { cwd: root, encoding: 'utf8' }).split('\n').map(l => l.trim()).filter(Boolean);

const FORBIDDEN = [
  /_admin_token\.txt/,
  /\.dump$/,
  /^\.trae\//,
  /^\.commitmsg\.tmp$/,
  /sso_backup/,
  /_add_server_token\.js/,
  /_check_token_db\.js/,
  /_clean_extraconfig\.js/,
  /_diag_403\.js/,
  /_diag_extraconfig\.js/,
  /_dump_oauth2\.js/,
  /_fill_oauth_creds\.js/,
  /_fix_oauth_service\.js/,
  /_fix_serverToken\.js/,
  /_prep_oauth_insert\.js/,
  /_restore_links\.js/,
  /_restore_oauth\.js/,
  /_restore_sites\.js/,
  /_verify_after_clean\.js/,
  /_wx_check_hjoho\.js/,
  /_wx_public_check\.js/,
  /_wx_verify_check\.js/,
  /_deploy_zcommon\.sh/,
  /_diag_login\.sh/,
  /_diag_permkeys\.sh/,
  /_diag_quiz_403\.sh/,
  /_diag_sso_roles\.sh/,
  /_gen_ai_summary\.js/,
  /_gen_hash\.sh/,
  /_probe_admin_login\.js/,
  /_probe_admin_perm\.sh/,
  /_probe_pages\.js/,
  /_repro_admin_login\.sh/,
  /_scan_secrets\.js/,
  /_set_id2_admin\.sh/,
  /_smoke_wealth_api\.js/,
  /_smoke_wealth_followup\.js/,
  /_ui_api_probe\.js/,
  /_ui_capture\.js/,
  /_ui_probe\.js/,
  /_ui_puttest\.js/,
  /_ui_verify\.js/,
  /_verify_admin_scope\.sh/,
  /_verify_ai_summary\.js/,
  /_verify_gen\.js/,
  /_verify_kg_edit\.js/,
  /_verify_login\.sh/,
  /_verify_ningyin_final\.mjs/,
  /_verify_ningyin_prod\.mjs/,
  /_verify_online\.sh/,
  /_verify_quiz_scope\.sh/,
  /_verify_ui_pages\.js/,
  /_walk_wealth_hall\.js/,
  /_walk_wealth_login\.js/,
  /\.build\//,
  /\.png$/,
];

const bad = staged.filter(f => FORBIDDEN.some(re => re.test(f)));
console.log('STAGED:', staged.length);
console.log('FORBIDDEN_HIT:', bad.length);
bad.forEach(f => console.log('  !! ' + f));
if (bad.length === 0) {
  // 输出分类统计
  const archive = staged.filter(f => f.startsWith('scripts/archive/')).length;
  const docs = staged.filter(f => f.startsWith('docs/')).length;
  const dist = staged.filter(f => f.startsWith('plugins/')).length;
  console.log('archive:', archive, 'docs:', docs, 'plugins:', dist, 'other:', staged.length - archive - docs - dist);
}
