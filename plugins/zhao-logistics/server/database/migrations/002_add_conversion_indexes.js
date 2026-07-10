'use strict';

async function getColumnName(knex, tableName, candidates) {
  const columns = await knex.raw(`SELECT column_name FROM information_schema.columns WHERE table_name = ?`, [tableName]);
  const columnNames = columns.rows.map(row => row.column_name);
  for (const candidate of candidates) {
    if (columnNames.includes(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function createUniqueIndexIfExists(knex, indexName, tableName, columns, whereClause = '') {
  const existing = await knex.raw(`SELECT indexname FROM pg_indexes WHERE tablename = ? AND indexname = ?`, [tableName, indexName]);
  if (existing.rows.length > 0) {
    return;
  }
  const columnNames = [];
  for (const col of columns) {
    if (col.includes('(')) {
      columnNames.push(col);
    } else {
      const candidates = [col, `${col}_document_id`, `${col}_id`];
      const actual = await getColumnName(knex, tableName, candidates);
      if (actual) {
        columnNames.push(actual);
      } else {
        return;
      }
    }
  }
  const where = whereClause ? ` WHERE ${whereClause}` : '';
  await knex.raw(`CREATE UNIQUE INDEX ${indexName} ON ${tableName} (${columnNames.join(', ')})${where}`);
}

async function createNonUniqueIndexIfExists(knex, indexName, tableName, columns, whereClause = '') {
  const existing = await knex.raw(`SELECT indexname FROM pg_indexes WHERE tablename = ? AND indexname = ?`, [tableName, indexName]);
  if (existing.rows.length > 0) {
    return;
  }
  const columnNames = [];
  for (const col of columns) {
    if (col.includes('(')) {
      columnNames.push(col);
    } else {
      const candidates = [col, `${col}_document_id`, `${col}_id`];
      const actual = await getColumnName(knex, tableName, candidates);
      if (actual) {
        columnNames.push(actual);
      } else {
        return;
      }
    }
  }
  const where = whereClause ? ` WHERE ${whereClause}` : '';
  await knex.raw(`CREATE INDEX ${indexName} ON ${tableName} (${columnNames.join(', ')})${where}`);
}

async function up({ db: knex }) {
  await createUniqueIndexIfExists(knex, 'zhao_logistics_referrals_site_referral_code_idx', 'zhao_logistics_referrals', ['site', 'referral_code'], 'deleted_at IS NULL');

  await createNonUniqueIndexIfExists(knex, 'idx_logistics_conversion_events_funnel_time', 'zhao_logistics_conversion_events', ['site', 'funnel', 'occurred_at'], 'deleted_at IS NULL');

  await createNonUniqueIndexIfExists(knex, 'idx_logistics_conversion_events_visitor_time', 'zhao_logistics_conversion_events', ['site', 'visitor_id', 'occurred_at'], 'deleted_at IS NULL');

  await createNonUniqueIndexIfExists(knex, 'idx_logistics_customer_profiles_phone', 'zhao_logistics_customer_profiles', ['site', 'contact_phone'], 'deleted_at IS NULL');

  await createNonUniqueIndexIfExists(knex, 'idx_logistics_landing_pages_slug', 'zhao_logistics_landing_pages', ['site', 'slug'], 'deleted_at IS NULL');

  await createNonUniqueIndexIfExists(knex, 'idx_logistics_intent_orders_status', 'zhao_logistics_intent_orders', ['site', 'status', 'created_at'], 'deleted_at IS NULL');

  await createNonUniqueIndexIfExists(knex, 'idx_logistics_reviews_featured', 'zhao_logistics_reviews', ['site', 'status', 'is_featured'], 'deleted_at IS NULL');

  await createNonUniqueIndexIfExists(knex, 'idx_logistics_subscriptions_target', 'zhao_logistics_subscriptions', ['site', 'channel_target', 'subscriber_type'], 'deleted_at IS NULL');

  await createNonUniqueIndexIfExists(knex, 'idx_logistics_conversion_funnels_active', 'zhao_logistics_conversion_funnels', ['site', 'is_active'], 'deleted_at IS NULL');
}

async function down({ db: knex }) {
  await knex.raw(`DROP INDEX IF EXISTS idx_logistics_conversion_events_funnel_time`);
  await knex.raw(`DROP INDEX IF EXISTS idx_logistics_conversion_events_visitor_time`);
  await knex.raw(`DROP INDEX IF EXISTS idx_logistics_customer_profiles_phone`);
  await knex.raw(`DROP INDEX IF EXISTS idx_logistics_landing_pages_slug`);
  await knex.raw(`DROP INDEX IF EXISTS idx_logistics_intent_orders_status`);
  await knex.raw(`DROP INDEX IF EXISTS idx_logistics_reviews_featured`);
  await knex.raw(`DROP INDEX IF EXISTS idx_logistics_subscriptions_target`);
  await knex.raw(`DROP INDEX IF EXISTS idx_logistics_conversion_funnels_active`);
  await knex.raw(`DROP INDEX IF EXISTS zhao_logistics_referrals_site_referral_code_idx`);
}

module.exports = { up, down };
