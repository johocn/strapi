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

async function createIndexIfExists(knex, indexName, tableName, columns, whereClause = '') {
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
  await createIndexIfExists(knex, 'zhao_website_articles_site_slug_idx', 'zhao_website_articles', ['site', 'slug'], 'deleted_at IS NULL');
  await createNonUniqueIndexIfExists(knex, 'zhao_website_articles_site_status_published_idx', 'zhao_website_articles', ['site', 'status', 'published_at DESC']);
  await createNonUniqueIndexIfExists(knex, 'zhao_website_articles_site_category_idx', 'zhao_website_articles', ['site', 'category']);
  await createNonUniqueIndexIfExists(knex, 'zhao_website_articles_site_featured_idx', 'zhao_website_articles', ['site', 'is_featured']);

  await createIndexIfExists(knex, 'zhao_website_article_categories_site_slug_idx', 'zhao_website_article_categories', ['site', 'slug'], 'deleted_at IS NULL');
  await createNonUniqueIndexIfExists(knex, 'zhao_website_article_categories_site_parent_idx', 'zhao_website_article_categories', ['site', 'parent']);

  await createIndexIfExists(knex, 'zhao_website_products_site_slug_idx', 'zhao_website_products', ['site', 'slug'], 'deleted_at IS NULL');

  await createIndexIfExists(knex, 'zhao_website_cases_site_slug_idx', 'zhao_website_cases', ['site', 'slug'], 'deleted_at IS NULL');

  await createIndexIfExists(knex, 'zhao_website_compliances_site_slug_idx', 'zhao_website_compliances', ['site', 'slug'], 'deleted_at IS NULL');

  await createIndexIfExists(knex, 'zhao_website_faqs_site_slug_idx', 'zhao_website_faqs', ['site', 'slug'], 'deleted_at IS NULL');

  await createIndexIfExists(knex, 'zhao_website_tutorials_site_slug_idx', 'zhao_website_tutorials', ['site', 'slug'], 'deleted_at IS NULL');

  await createNonUniqueIndexIfExists(knex, 'zhao_website_downloads_site_filetype_idx', 'zhao_website_downloads', ['site', 'file_type']);

  await createNonUniqueIndexIfExists(knex, 'zhao_website_leads_site_type_idx', 'zhao_website_leads', ['site', 'type']);
  await createNonUniqueIndexIfExists(knex, 'zhao_website_leads_site_status_idx', 'zhao_website_leads', ['site', 'status']);
  await createNonUniqueIndexIfExists(knex, 'zhao_website_leads_site_assigned_idx', 'zhao_website_leads', ['site', 'assigned_to']);
  await createNonUniqueIndexIfExists(knex, 'zhao_website_leads_site_created_idx', 'zhao_website_leads', ['site', 'created_at DESC']);

  await createNonUniqueIndexIfExists(knex, 'zhao_website_visit_logs_site_type_created_idx', 'zhao_website_visit_logs', ['site', 'type', 'created_at']);
  await createNonUniqueIndexIfExists(knex, 'zhao_website_visit_logs_site_target_idx', 'zhao_website_visit_logs', ['site', 'target_type', 'target_id']);
  await createNonUniqueIndexIfExists(knex, 'zhao_website_visit_logs_site_visitor_idx', 'zhao_website_visit_logs', ['site', 'visitor_id']);
  await createNonUniqueIndexIfExists(knex, 'zhao_website_visit_logs_site_keyword_idx', 'zhao_website_visit_logs', ['site', 'search_keyword']);

  await createIndexIfExists(knex, 'zhao_website_interactions_dedup_idx', 'zhao_website_interactions', ['site', 'type', 'target_type', 'target_id', 'visitor_id'], 'deleted_at IS NULL');
  await createNonUniqueIndexIfExists(knex, 'zhao_website_interactions_site_target_idx', 'zhao_website_interactions', ['site', 'target_type', 'target_id', 'type']);

  await createNonUniqueIndexIfExists(knex, 'zhao_website_search_logs_site_keyword_idx', 'zhao_website_search_logs', ['site', 'keyword', 'created_at']);
  await createNonUniqueIndexIfExists(knex, 'zhao_website_search_logs_site_created_idx', 'zhao_website_search_logs', ['site', 'created_at DESC']);

  await createIndexIfExists(knex, 'zhao_website_knowledge_entities_site_slug_idx', 'zhao_website_knowledge_entities', ['site', 'slug'], 'deleted_at IS NULL');
  await createNonUniqueIndexIfExists(knex, 'zhao_website_knowledge_entities_site_type_idx', 'zhao_website_knowledge_entities', ['site', 'entity_type']);
  await createNonUniqueIndexIfExists(knex, 'zhao_website_knowledge_entities_site_identifier_idx', 'zhao_website_knowledge_entities', ['site', 'identifier']);

  await createIndexIfExists(knex, 'zhao_website_knowledge_relations_entity_triple_idx', 'zhao_website_knowledge_relations', ['subject_entity', 'predicate', 'object_entity'], 'object_entity IS NOT NULL AND deleted_at IS NULL');
  await createNonUniqueIndexIfExists(knex, 'zhao_website_knowledge_relations_subject_idx', 'zhao_website_knowledge_relations', ['subject_entity', 'predicate']);
  await createNonUniqueIndexIfExists(knex, 'zhao_website_knowledge_relations_object_idx', 'zhao_website_knowledge_relations', ['object_entity', 'predicate']);

  await createIndexIfExists(knex, 'zhao_website_ai_summaries_target_idx', 'zhao_website_ai_summaries', ['site', 'target_type', 'target_id', 'summary_type', 'language'], 'deleted_at IS NULL');

  await createIndexIfExists(knex, 'zhao_website_first_truths_site_claim_key_idx', 'zhao_website_first_truths', ['site', 'claim_key'], 'deleted_at IS NULL');
  await createNonUniqueIndexIfExists(knex, 'zhao_website_first_truths_site_category_idx', 'zhao_website_first_truths', ['site', 'claim_category']);
  await createNonUniqueIndexIfExists(knex, 'zhao_website_first_truths_site_status_idx', 'zhao_website_first_truths', ['site', 'verification_status']);
}

async function down({ db: knex }) {
  const indexes = [
    'zhao_website_articles_site_slug_idx', 'zhao_website_articles_site_status_published_idx',
    'zhao_website_articles_site_category_idx', 'zhao_website_articles_site_featured_idx',
    'zhao_website_article_categories_site_slug_idx', 'zhao_website_article_categories_site_parent_idx',
    'zhao_website_products_site_slug_idx', 'zhao_website_cases_site_slug_idx',
    'zhao_website_compliances_site_slug_idx', 'zhao_website_faqs_site_slug_idx',
    'zhao_website_tutorials_site_slug_idx', 'zhao_website_downloads_site_filetype_idx',
    'zhao_website_leads_site_type_idx', 'zhao_website_leads_site_status_idx',
    'zhao_website_leads_site_assigned_idx', 'zhao_website_leads_site_created_idx',
    'zhao_website_visit_logs_site_type_created_idx', 'zhao_website_visit_logs_site_target_idx',
    'zhao_website_visit_logs_site_visitor_idx', 'zhao_website_visit_logs_site_keyword_idx',
    'zhao_website_interactions_dedup_idx', 'zhao_website_interactions_site_target_idx',
    'zhao_website_search_logs_site_keyword_idx', 'zhao_website_search_logs_site_created_idx',
    'zhao_website_knowledge_entities_site_slug_idx', 'zhao_website_knowledge_entities_site_type_idx',
    'zhao_website_knowledge_entities_site_identifier_idx',
    'zhao_website_knowledge_relations_entity_triple_idx', 'zhao_website_knowledge_relations_subject_idx',
    'zhao_website_knowledge_relations_object_idx',
    'zhao_website_ai_summaries_target_idx',
    'zhao_website_first_truths_site_claim_key_idx', 'zhao_website_first_truths_site_category_idx',
    'zhao_website_first_truths_site_status_idx',
  ];
  for (const idx of indexes) {
    await knex.raw(`DROP INDEX IF EXISTS ${idx}`);
  }
}

module.exports = { up, down };
