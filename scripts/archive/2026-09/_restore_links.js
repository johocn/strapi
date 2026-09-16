#!/usr/bin/env node
// 补关联：根渠道↔两个租户；锦润学域↔coursera-blue 模板
const { Client } = require('/www/apps/strapi/node_modules/pg', 'lib');
const c = new Client({ host: '127.0.0.1', port: 5432, database: 'strapi', user: 'strapi', password: '__DB_PASSWORD__', ssl: false });

(async () => {
  await c.connect();
  const log = [];

  // 1) zhao_channels_sites_lnk：根渠道 channel_id=1 ↔ site 2(圣麟口腔) 和 site 3(锦润学域)
  const rootChannel = await c.query(`SELECT id FROM zhao_channels WHERE channel_tier='root' ORDER BY id LIMIT 1`);
  const ch = rootChannel.rows[0]?.id;
  for (const { siteId, domain } of [{ siteId: 2, domain: 'www.shenglin.vip' }, { siteId: 3, domain: 'v.joho.cn' }]) {
    const exists = await c.query(`SELECT id FROM zhao_channels_sites_lnk WHERE channel_id=$1 AND site_config_id=$2`, [ch, siteId]);
    if (exists.rows.length === 0) {
      const r = await c.query(`INSERT INTO zhao_channels_sites_lnk (channel_id, site_config_id) VALUES ($1,$2) RETURNING id`, [ch, siteId]);
      log.push(`lnk channel ${ch} -> site ${siteId} (${domain}) id=${r.rows[0].id}`);
    } else {
      log.push(`lnk channel ${ch} -> site ${siteId} (${domain}) exists, skip`);
    }
  }

  // 2) zhao_site_configs_template_lnk：锦润学域(3) ↔ coursera-blue(2)
  const tt = await c.query(`SELECT id FROM zhao_site_templates WHERE name='coursera-blue' LIMIT 1`);
  const tpl = tt.rows[0]?.id;
  if (tpl) {
    const exists = await c.query(`SELECT id FROM zhao_site_configs_template_lnk WHERE site_config_id=3 AND site_template_id=$1`, [tpl]);
    if (exists.rows.length === 0) {
      const r = await c.query(`INSERT INTO zhao_site_configs_template_lnk (site_config_id, site_template_id, site_config_ord) VALUES (3,$1,1) RETURNING id`, [tpl]);
      log.push(`tpl site3 -> template ${tpl} (coursera-blue) id=${r.rows[0].id}`);
    } else {
      log.push(`tpl site3 -> template ${tpl} exists, skip`);
    }
  }

  // 3) 校验
  const s = await c.query(`SELECT sc.id, sc.site_name, sc.domain, t.name AS template
     FROM zhao_site_configs sc
     LEFT JOIN zhao_site_configs_template_lnk tl ON tl.site_config_id=sc.id
     LEFT JOIN zhao_site_templates t ON t.id=tl.site_template_id
     ORDER BY sc.id`);
  const l = await c.query(`SELECT lk.id, lk.channel_id, lk.site_config_id, sc.site_name FROM zhao_channels_sites_lnk lk
     LEFT JOIN zhao_site_configs sc ON sc.id=lk.site_config_id ORDER BY lk.site_config_id`);

  console.log('LNK_RESULT', JSON.stringify(log));
  console.log('FINAL_SITES', JSON.stringify(s.rows));
  console.log('FINAL_LINKS', JSON.stringify(l.rows));
  await c.end();
})().catch(e => { console.error('FATAL', e); process.exit(1); });