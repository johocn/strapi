'use strict';

async function up({ db: knex }) {
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_articles_site_pinned_idx ON zhao_website_articles (site_id, is_pinned, published_at DESC) WHERE deleted_at IS NULL AND status = 'published'`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_tutorials_site_difficulty_idx ON zhao_website_tutorials (site_id, difficulty) WHERE deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_compliances_site_pinned_idx ON zhao_website_compliances (site_id, is_pinned, published_at DESC) WHERE deleted_at IS NULL AND status = 'published'`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_faqs_site_category_idx ON zhao_website_faqs (site_id, category_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS zhao_website_faqs_site_status_idx ON zhao_website_faqs (site_id, status)`);
}

async function down({ db: knex }) {
  const indexes = ['zhao_website_articles_site_pinned_idx', 'zhao_website_tutorials_site_difficulty_idx', 'zhao_website_compliances_site_pinned_idx', 'zhao_website_faqs_site_category_idx', 'zhao_website_faqs_site_status_idx'];
  for (const idx of indexes) { await knex.raw(`DROP INDEX IF EXISTS ${idx}`); }
}

module.exports = { up, down };
