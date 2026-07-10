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
  await createUniqueIndexIfExists(knex, 'zhao_logistics_tracking_shipments_site_tracking_no_idx', 'zhao_logistics_tracking_shipments', ['site', 'tracking_no'], 'deleted_at IS NULL');

  await createNonUniqueIndexIfExists(knex, 'idx_logistics_quote_requests_site_route_status', 'zhao_logistics_quote_requests', ['site', 'route_id', 'status', 'created_at'], 'deleted_at IS NULL');

  await createNonUniqueIndexIfExists(knex, 'idx_logistics_tracking_nodes_site_shipment_time', 'zhao_logistics_tracking_nodes', ['site', 'shipment', 'event_time'], 'deleted_at IS NULL');

  await createNonUniqueIndexIfExists(knex, 'idx_logistics_quote_price_rules_match', 'zhao_logistics_quote_price_rules', ['site', 'route_id', 'service_provider', 'min_weight', 'max_weight'], 'deleted_at IS NULL AND is_active = true');

  await createNonUniqueIndexIfExists(knex, 'idx_logistics_quote_field_rules_match', 'zhao_logistics_quote_field_rules', ['site', 'is_active', 'priority DESC'], 'deleted_at IS NULL');
}

async function down({ db: knex }) {
  await knex.raw(`DROP INDEX IF EXISTS idx_logistics_quote_requests_site_route_status`);
  await knex.raw(`DROP INDEX IF EXISTS idx_logistics_tracking_nodes_site_shipment_time`);
  await knex.raw(`DROP INDEX IF EXISTS idx_logistics_quote_price_rules_match`);
  await knex.raw(`DROP INDEX IF EXISTS idx_logistics_quote_field_rules_match`);
  await knex.raw(`DROP INDEX IF EXISTS zhao_logistics_tracking_shipments_site_tracking_no_idx`);
}

module.exports = { up, down };
