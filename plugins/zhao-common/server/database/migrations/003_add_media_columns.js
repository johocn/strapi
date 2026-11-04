module.exports = {
  async up({ strapi, db }) {
    const hasTable = await db.schema.hasTable('zhao_site_configs');
    if (!hasTable) {
      strapi.log.info('[migration 003] zhao_site_configs 不存在，跳过');
      return;
    }
    const hasLogo = await db.schema.hasColumn('zhao_site_configs', 'logo_document_id');
    if (!hasLogo) {
      await db.schema.alterTable('zhao_site_configs', (table) => {
        table.integer('logo_document_id').unsigned().nullable();
        table.integer('favicon_document_id').unsigned().nullable();
        table.integer('share_image_document_id').unsigned().nullable();
      });
    }
  },

  async down({ strapi, db }) {
    const hasTable = await db.schema.hasTable('zhao_site_configs');
    if (!hasTable) return;
    await db.schema.alterTable('zhao_site_configs', (table) => {
      table.dropColumn('logo_document_id');
      table.dropColumn('favicon_document_id');
      table.dropColumn('share_image_document_id');
    });
  },
};
