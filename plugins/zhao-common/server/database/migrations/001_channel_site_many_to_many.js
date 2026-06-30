'use strict';

async function resolveJoinTable(db) {
  const candidates = [
    'zhao_channels_site-config_links',
    'zhao_site_configs_channels_links',
    'zhao_channels_site_configs_links',
  ];
  for (const name of candidates) {
    if (await db.schema.hasTable(name)) return name;
  }
  const rows = await db.raw(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name LIKE '%channel%' AND table_name LIKE '%site%' AND table_name LIKE '%\\_links'"
  );
  const list = Array.isArray(rows) ? rows[0] : rows;
  if (Array.isArray(list) && list.length > 0) {
    return list[0].table_name || list[0].TABLE_NAME;
  }
  return null;
}

async function detectColumns(db, joinTable) {
  const columnInfo = await db(joinTable).columnInfo();
  const cols = Object.keys(columnInfo);
  const channelIdColumn = cols.find((c) => c.includes('channel'));
  const siteIdColumn = cols.find((c) => c.includes('site'));
  if (!channelIdColumn || !siteIdColumn) {
    throw new Error(`[migration 001] 中间表 ${joinTable} 列名异常: ${cols.join(', ')}`);
  }
  return { channelIdColumn, siteIdColumn };
}

module.exports = {
  async up({ strapi, db }) {
    const channelCols = await db('zhao_channels').columnInfo();
    if (!('site_id' in channelCols)) {
      strapi.log.info('[migration 001] zhao_channels.site_id 列不存在，跳过迁移');
      return;
    }

    const channels = await db('zhao_channels')
      .whereNotNull('site_id')
      .select('id', 'site_id');

    if (channels.length === 0) {
      strapi.log.info('[migration 001] 无 site_id 非空记录，跳过');
      return;
    }

    const joinTable = await resolveJoinTable(db);
    if (!joinTable) {
      throw new Error('[migration 001] 未找到 channel-site 中间表，请确认 Strapi 已同步表结构');
    }

    const { channelIdColumn, siteIdColumn } = await detectColumns(db, joinTable);

    let inserted = 0;
    let skipped = 0;
    for (const ch of channels) {
      const exists = await db(joinTable)
        .where(channelIdColumn, ch.id)
        .where(siteIdColumn, ch.site_id)
        .first();
      if (exists) {
        skipped++;
        continue;
      }
      await db(joinTable).insert({
        [channelIdColumn]: ch.id,
        [siteIdColumn]: ch.site_id,
      });
      inserted++;
    }

    strapi.log.info(
      `[migration 001] channel→site 关联迁移完成：插入 ${inserted}，跳过 ${skipped}（${joinTable}: ${channelIdColumn}/${siteIdColumn}）`
    );
  },

  async down({ strapi, db }) {
    const joinTable = await resolveJoinTable(db);
    if (!joinTable) return;
    await db(joinTable).del();
    strapi.log.info(`[migration 001 down] 已清空 ${joinTable}`);
  },
};
