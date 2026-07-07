'use strict';

async function up({ db: knex }) {
  const sites = await knex('zhao_site_configs').orderBy('id', 'asc').limit(1);
  if (sites.length === 0) { console.log('[zhao-oss 001] 无 site-config，跳过回填'); return; }
  const defaultSite = sites[0];
  const files = await knex('files').whereNotExists(function () {
    this.select('file_id').from('zhao_oss_media_metas').whereRaw('zhao_oss_media_metas.file_id = files.id');
  });
  if (files.length === 0) { console.log('[zhao-oss 001] 无存量文件需回填'); return; }
  const rows = files.map((f) => ({
    site_id: defaultSite.id,
    file_id: f.id,
    category: 'general',
    original_filename: f.name,
    mime_type: f.mime,
    file_size: f.size,
    file_ext: f.ext,
    is_public: true,
    created_at: new Date(),
    updated_at: new Date(),
  }));
  await knex('zhao_oss_media_metas').insert(rows);
  console.log(`[zhao-oss 001] 已回填 ${rows.length} 条 media-meta`);
}

async function down({ db: knex }) {}

module.exports = { up, down };
