module.exports = {
  async up(knex) {
    const hasLogo = await knex.raw("SELECT column_name FROM information_schema.columns WHERE table_name = 'zhao_site_configs' AND column_name = 'logo_document_id'");
    if (hasLogo.rows.length === 0) {
      await knex.schema.alterTable('zhao_site_configs', (table) => {
        table.integer('logo_document_id').unsigned().nullable();
        table.integer('favicon_document_id').unsigned().nullable();
        table.integer('share_image_document_id').unsigned().nullable();
      });
    }
  },

  async down(knex) {
    await knex.schema.alterTable('zhao_site_configs', (table) => {
      table.dropColumn('logo_document_id');
      table.dropColumn('favicon_document_id');
      table.dropColumn('share_image_document_id');
    });
  },
};