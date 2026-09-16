#!/usr/bin/env node
// 从 8-30 逻辑备份恢复到现库：只补 zhao_site_configs(锦润/圣麟口腔) + 关联 lnk，不动其他
const zlib = require('zlib');
const fs = require('fs');
const { Client } = require('/www/apps/strapi/node_modules/pg', 'lib');

const BK = '/home/admin/strapi_pre_cleanup_20260830.jsonl.gz';
const c = new Client({ host: '127.0.0.1', port: 5432, database: 'strapi', user: 'strapi', password: '__DB_PASSWORD__', ssl: false });

function readJsonlGz(path) {
  return new Promise((resolve, reject) => {
    const reader = zlib.createGunzip();
    const inStream = fs.createReadStream(path).pipe(reader);
    let buf = '';
    const out = {};
    inStream.on('data', d => {
      buf += d.toString();
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        if (line.startsWith('#T\t')) { out.table = line.slice(3); continue; }
        if (out.table === 'zhao_site_configs' || out.table === 'zhao_site_configs_template_lnk' ||
            out.table === 'zhao_channels_sites_lnk' || out.table === 'zhao_channels') {
          try {
            (out[out.table] = out[out.table] || []).push(JSON.parse(line));
          } catch (e) { /* skip */ }
        }
      }
    });
    inStream.on('end', () => resolve(out));
    inStream.on('error', reject);
  });
}

(async () => {
  await c.connect();
  const bk = await readJsonlGz(BK);
  const sites = bk['zhao_site_configs'].filter(s => s.domain === 'v.joho.cn' || s.domain === 'www.shenglin.vip');
  console.log('BACKUP_SITES_TO_RESTORE', sites.map(s => ({ id: s.id, name: s.site_name, domain: s.domain })));

  // 现库已存在的 domain，避免唯一冲突
  const existing = await c.query(`SELECT id, document_id, domain FROM zhao_site_configs WHERE domain IN ('v.joho.cn','www.shenglin.vip')`);
  console.log('CURRENT_CONFLICT', existing.rows);

  const now = new Date().toISOString();
  const result = { inserted: 0, skipped: 0, newIds: {} };

  for (const s of sites) {
    if (existing.rows.some(r => r.domain === s.domain)) { result.skipped++; continue; }

    const ins = await c.query(
      `INSERT INTO zhao_site_configs
        (document_id, site_name, site_description, icp_number, seo_keywords, seo_description,
         tencent_map_key, share_title, share_description, customer_service_url, domain,
         feature_flags, module_visibility, extra_config, theme_config, channel_usage,
         poster_default_user_name, poster_default_recommend_reason, speed_privileged_roles,
         created_at, updated_at, published_at, created_by_id, updated_by_id, locale)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING id`,
      [
        s.document_id, s.site_name, s.site_description || null, s.icp_number || null, s.seo_keywords || null, s.seo_description || null,
        s.tencent_map_key || null, s.share_title || null, s.share_description || null, s.customer_service_url || null, s.domain,
        s.feature_flags || {}, s.module_visibility || {}, s.extra_config || {}, s.theme_config || {}, s.channel_usage || null,
        s.poster_default_user_name || null, s.poster_default_recommend_reason || null, s.speed_privileged_roles || null,
        s.created_at || now, s.updated_at || now, s.published_at || now, s.created_by_id || null, s.updated_by_id || null, s.locale || null,
      ]
    );
    result.newIds[s.domain] = ins.rows[0].id;
    result.inserted++;
    console.log('INSERTED', s.domain, '-> new id', ins.rows[0].id, 'old id', s.id);
  }
  console.log('RESULT', JSON.stringify(result));
  await c.end();
})().catch(e => { console.error('FATAL', e); process.exit(1); });