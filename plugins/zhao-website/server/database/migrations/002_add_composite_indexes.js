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
  await createNonUniqueIndexIfExists(knex, 'zhao_website_articles_site_pinned_idx', 'zhao_website_articles', ['site', 'is_pinned', 'published_at DESC'], 'deleted_at IS NULL AND status = \'published\'');
  await createNonUniqueIndexIfExists(knex, 'zhao_website_tutorials_site_difficulty_idx', 'zhao_website_tutorials', ['site', 'difficulty'], 'deleted_at IS NULL');
  await createNonUniqueIndexIfExists(knex, 'zhao_website_compliances_site_pinned_idx', 'zhao_website_compliances', ['site', 'is_pinned', 'published_at DESC'], 'deleted_at IS NULL AND status = \'published\'');
  await createNonUniqueIndexIfExists(knex, 'zhao_website_faqs_site_category_idx', 'zhao_website_faqs', ['site', 'category']);
  await createNonUniqueIndexIfExists(knex, 'zhao_website_faqs_site_status_idx', 'zhao_website_faqs', ['site', 'status']);
}

async function down({ db: knex }) {
  const indexes = ['zhao_website_articles_site_pinned_idx', 'zhao_website_tutorials_site_difficulty_idx', 'zhao_website_compliances_site_pinned_idx', 'zhao_website_faqs_site_category_idx', 'zhao_website_faqs_site_status_idx'];
  for (const idx of indexes) { await knex.raw(`DROP INDEX IF EXISTS ${idx}`); }
}

module.exports = { up, down };
