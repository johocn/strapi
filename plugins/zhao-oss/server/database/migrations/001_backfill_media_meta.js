'use strict';

async function up({ db: knex }) {
  // 确保 zhao_oss_media_metas 表存在（Strapi 自动建表可能尚未执行）
  const hasTable = await knex.schema.hasTable('zhao_oss_media_metas');
  if (!hasTable) {
    console.log('[zhao-oss 001] zhao_oss_media_metas 表不存在，跳过回填');
    return;
  }

  // 补建 Strapi 未自动创建的关系列（Strapi v5 已知问题）
  const hasSiteId = await knex.schema.hasColumn('zhao_oss_media_metas', 'site_id');
  if (!hasSiteId) {
    console.log('[zhao-oss 001] 补建 site_id 列');
    await knex.schema.table('zhao_oss_media_metas', (table) => {
      table.integer('site_id').nullable().references('id').inTable('zhao_site_configs').onDelete('SET NULL');
    });
    console.log('[zhao-oss 001] site_id 列补建完成');
  }

  const hasFolderId = await knex.schema.hasColumn('zhao_oss_media_metas', 'folder_id');
  if (!hasFolderId) {
    console.log('[zhao-oss 001] 补建 folder_id 列');
    try {
      await knex.schema.table('zhao_oss_media_metas', (table) => {
        table.integer('folder_id').nullable().references('id').inTable('upload_folders').onDelete('SET NULL');
      });
      console.log('[zhao-oss 001] folder_id 列补建完成');
    } catch (e) {
      console.log(`[zhao-oss 001] folder_id 列补建跳过: ${e.message}`);
    }
  }

  const hasUploaderId = await knex.schema.hasColumn('zhao_oss_media_metas', 'uploader_id');
  if (!hasUploaderId) {
    console.log('[zhao-oss 001] 补建 uploader_id 列');
    try {
      await knex.schema.table('zhao_oss_media_metas', (table) => {
        table.integer('uploader_id').nullable().references('id').inTable('admin_users').onDelete('SET NULL');
      });
      console.log('[zhao-oss 001] uploader_id 列补建完成');
    } catch (e) {
      console.log(`[zhao-oss 001] uploader_id 列补建跳过: ${e.message}`);
    }
  }

  const hasModifierId = await knex.schema.hasColumn('zhao_oss_media_metas', 'modifier_id');
  if (!hasModifierId) {
    console.log('[zhao-oss 001] 补建 modifier_id 列');
    try {
      await knex.schema.table('zhao_oss_media_metas', (table) => {
        table.integer('modifier_id').nullable().references('id').inTable('admin_users').onDelete('SET NULL');
      });
      console.log('[zhao-oss 001] modifier_id 列补建完成');
    } catch (e) {
      console.log(`[zhao-oss 001] modifier_id 列补建跳过: ${e.message}`);
    }
  }

  const sites = await knex('zhao_site_configs').orderBy('id', 'asc').limit(1);
  if (sites.length === 0) { console.log('[zhao-oss 001] 无 site-config，跳过回填'); return; }
  const defaultSite = sites[0];

  // 检查是否已有 media_meta 记录，避免重复回填
  const existingCount = await knex('zhao_oss_media_metas').count('id as cnt').first();
  if (existingCount && existingCount.cnt > 0) {
    console.log(`[zhao-oss 001] 已有 ${existingCount.cnt} 条记录，跳过回填`);
    return;
  }

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

  // 分批插入，避免单次插入过多
  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await knex('zhao_oss_media_metas').insert(batch);
  }
  console.log(`[zhao-oss 001] 已回填 ${rows.length} 条 media-meta`);
}

async function down({ db: knex }) {}

module.exports = { up, down };
