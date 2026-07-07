'use strict';

async function up({ db: knex }) {
  // article
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_articles_site_slug_idx ON zhao_website_articles (site_id, slug) WHERE deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_articles_site_status_published_idx ON zhao_website_articles (site_id, status, published_at DESC)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_articles_site_category_idx ON zhao_website_articles (site_id, category_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_articles_site_featured_idx ON zhao_website_articles (site_id, is_featured)`);
  // article-category
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_article_categories_site_slug_idx ON zhao_website_article_categories (site_id, slug) WHERE deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_article_categories_site_parent_idx ON zhao_website_article_categories (site_id, parent_id)`);
  // product
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_products_site_slug_idx ON zhao_website_products (site_id, slug) WHERE deleted_at IS NULL`);
  // case
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_cases_site_slug_idx ON zhao_website_cases (site_id, slug) WHERE deleted_at IS NULL`);
  // compliance
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_compliances_site_slug_idx ON zhao_website_compliances (site_id, slug) WHERE deleted_at IS NULL`);
  // faq
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_faqs_site_slug_idx ON zhao_website_faqs (site_id, slug) WHERE deleted_at IS NULL`);
  // tutorial
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_tutorials_site_slug_idx ON zhao_website_tutorials (site_id, slug) WHERE deleted_at IS NULL`);
  // download
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_downloads_site_filetype_idx ON zhao_website_downloads (site_id, file_type)`);
  // lead
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_leads_site_type_idx ON zhao_website_leads (site_id, type)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_leads_site_status_idx ON zhao_website_leads (site_id, status)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_leads_site_assigned_idx ON zhao_website_leads (site_id, assigned_to_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_leads_site_created_idx ON zhao_website_leads (site_id, created_at DESC)`);
  // visit-log
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_visit_logs_site_type_created_idx ON zhao_website_visit_logs (site_id, type, created_at)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_visit_logs_site_target_idx ON zhao_website_visit_logs (site_id, target_type, target_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_visit_logs_site_visitor_idx ON zhao_website_visit_logs (site_id, visitor_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_visit_logs_site_keyword_idx ON zhao_website_visit_logs (site_id, search_keyword)`);
  // interaction
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_interactions_dedup_idx ON zhao_website_interactions (site_id, type, target_type, target_id, visitor_id) WHERE deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_interactions_site_target_idx ON zhao_website_interactions (site_id, target_type, target_id, type)`);
  // search-log
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_search_logs_site_keyword_idx ON zhao_website_search_logs (site_id, keyword, created_at)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_search_logs_site_created_idx ON zhao_website_search_logs (site_id, created_at DESC)`);
  // knowledge-entity
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_knowledge_entities_site_slug_idx ON zhao_website_knowledge_entities (site_id, slug) WHERE deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_knowledge_entities_site_type_idx ON zhao_website_knowledge_entities (site_id, entity_type)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_knowledge_entities_site_identifier_idx ON zhao_website_knowledge_entities (site_id, identifier)`);
  // knowledge-relation
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_knowledge_relations_entity_triple_idx ON zhao_website_knowledge_relations (subject_entity_id, predicate, object_entity_id) WHERE object_entity_id IS NOT NULL AND deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_knowledge_relations_subject_idx ON zhao_website_knowledge_relations (subject_entity_id, predicate)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_knowledge_relations_object_idx ON zhao_website_knowledge_relations (object_entity_id, predicate)`);
  // ai-content-summary
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_ai_summaries_target_idx ON zhao_website_ai_summaries (site_id, target_type, target_id, summary_type, language) WHERE deleted_at IS NULL`);
  // first-truth-policy
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_first_truths_site_claim_key_idx ON zhao_website_first_truths (site_id, claim_key) WHERE deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_first_truths_site_category_idx ON zhao_website_first_truths (site_id, claim_category)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_first_truths_site_status_idx ON zhao_website_first_truths (site_id, verification_status)`);
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
