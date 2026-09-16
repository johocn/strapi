#!/usr/bin/env node
const { Client } = require('/www/apps/strapi/node_modules/pg');
const c = new Client({ host: '127.0.0.1', port: 5432, database: 'strapi', user: 'strapi', password: '__DB_PASSWORD__', ssl: false });
const now = new Date().toISOString();
(async () => {
  await c.connect();
  // 表列结构
  const cols = await c.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='sso_oauth_configs' AND column_name NOT IN ('id') ORDER BY ordinal_position`);
  console.log('COLS', JSON.stringify(cols.rows.map(r=>r.column_name)));
  // 幂等：若有 wechat official_account 已存在则不插
  const ex = await c.query(`SELECT id FROM sso_oauth_configs WHERE provider='wechat' AND app_type='official_account'`);
  if (ex.rows.length > 0) { console.log('ALREADY_EXISTS', ex.rows[0].id); await c.end(); return; }
  const ins = await c.query(
    `INSERT INTO sso_oauth_configs
      (document_id, name, description, provider, app_type, app_id, app_secret, scope,
       extra_config, redirect_uris, is_enabled, created_at, updated_at, published_at,
       created_by_id, updated_by_id, locale)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
    [
      'fpo3ogqd383qxfgjwxo3gxu2', '微信公众号', '', 'wechat', 'official_account',
      'wx17d58d73062d1899', 'e745b67711ec9c11d9eca00b582c37ee', '',
      { token:'', authUpgrade:true, oauthScopes:['snsapi_userinfo','snsapi_base'], encodingAESKey:'' },
      null, true, now, now, now, null, null, null
    ]
  );
  console.log('INSERTED_OAUTH_ID', ins.rows[0].id);
  const chk = await c.query(`SELECT id, provider, app_type, app_id, app_secret, is_enabled FROM sso_oauth_configs WHERE id=${ins.rows[0].id}`);
  console.log('VERIFY', JSON.stringify(chk.rows[0]));
  await c.end();
})().catch(e => { console.error('FATAL', e); process.exit(1); });