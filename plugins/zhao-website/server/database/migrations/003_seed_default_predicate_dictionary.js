'use strict';

const PREDICATES = [
  { entity_type: 'Organization', predicate: 'founder' },
  { entity_type: 'Organization', predicate: 'foundingDate' },
  { entity_type: 'Organization', predicate: 'legalName' },
  { entity_type: 'Organization', predicate: 'areaServed' },
  { entity_type: 'Organization', predicate: 'numberOfEmployees' },
  { entity_type: 'Organization', predicate: 'contactPoint' },
  { entity_type: 'Organization', predicate: 'location' },
  { entity_type: 'Organization', predicate: 'hasOfferCatalog' },
  { entity_type: 'Person', predicate: 'affiliation' },
  { entity_type: 'Person', predicate: 'jobTitle' },
  { entity_type: 'Person', predicate: 'worksFor' },
  { entity_type: 'Person', predicate: 'alumniOf' },
  { entity_type: 'Product', predicate: 'manufacturer' },
  { entity_type: 'Product', predicate: 'brand' },
  { entity_type: 'Product', predicate: 'offers' },
  { entity_type: 'Product', predicate: 'aggregateRating' },
  { entity_type: 'Product', predicate: 'category' },
  { entity_type: 'Article', predicate: 'about' },
  { entity_type: 'Article', predicate: 'mentions' },
  { entity_type: 'Article', predicate: 'author' },
  { entity_type: 'Article', predicate: 'publisher' },
  { entity_type: 'Article', predicate: 'datePublished' },
  { entity_type: 'CaseStudy', predicate: 'subjectOf' },
  { entity_type: 'CaseStudy', predicate: 'about' },
  { entity_type: 'CaseStudy', predicate: 'mentions' },
  { entity_type: 'Event', predicate: 'organizer' },
  { entity_type: 'Event', predicate: 'location' },
  { entity_type: 'Event', predicate: 'startDate' },
  { entity_type: 'Event', predicate: 'subEvent' },
  { entity_type: 'FAQ', predicate: 'about' },
  { entity_type: 'FAQ', predicate: 'mentions' },
  { entity_type: 'FAQ', predicate: 'mainEntity' },
  { entity_type: 'HowTo', predicate: 'about' },
  { entity_type: 'HowTo', predicate: 'mentions' },
  { entity_type: 'HowTo', predicate: 'hasStep' },
  { entity_type: 'Download', predicate: 'about' },
  { entity_type: 'Download', predicate: 'mentions' },
  { entity_type: 'Download', predicate: 'fileFormat' },
];

async function up({ db: knex }) {
  const exists = await knex.schema.hasTable('zhao_website_predicate_dictionary');
  if (!exists) {
    await knex.schema.createTable('zhao_website_predicate_dictionary', (t) => {
      t.increments('id').primary();
      t.string('entity_type', 50).notNullable();
      t.string('predicate', 100).notNullable();
      t.unique(['entity_type', 'predicate']);
    });
  }
  for (const item of PREDICATES) {
    await knex('zhao_website_predicate_dictionary').insert(item).onConflict(['entity_type', 'predicate']).ignore();
  }
}

async function down({ db: knex }) {
  await knex('zhao_website_predicate_dictionary').del();
}

module.exports = { up, down };
