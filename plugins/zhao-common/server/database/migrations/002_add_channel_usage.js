'use strict';

module.exports = {
  async up({ strapi, db }) {
    const hasColumn = await db.schema.hasColumn('zhao_site_configs', 'channel_usage');
    if (hasColumn) {
      strapi.log.info('[migration 002] channel_usage 列已存在，跳过');
      return;
    }

    await db.raw(`
      ALTER TABLE zhao_site_configs
      ADD COLUMN channel_usage VARCHAR(20) NOT NULL DEFAULT 'site_cross_user'
    `);

    strapi.log.info('[migration 002] channel_usage 列已添加，默认值 site_cross_user');
  },

  async down({ strapi, db }) {
    const hasColumn = await db.schema.hasColumn('zhao_site_configs', 'channel_usage');
    if (hasColumn) {
      await db.raw('ALTER TABLE zhao_site_configs DROP COLUMN channel_usage');
      strapi.log.info('[migration 002 down] channel_usage 列已删除');
    }
  },
};
