'use strict';

const CATEGORIES = [
  { category: 'business_license', label: '营业执照信息', default_priority: 100 },
  { category: 'brand_claim', label: '品牌声明', default_priority: 90 },
  { category: 'technical_spec', label: '技术规格', default_priority: 80 },
  { category: 'certification', label: '资质认证', default_priority: 85 },
  { category: 'financial', label: '财务信息', default_priority: 95 },
  { category: 'other', label: '其他', default_priority: 50 },
];

async function up({ db: knex }) {
  const exists = await knex.schema.hasTable('zhao_website_first_truth_categories');
  if (!exists) {
    await knex.schema.createTable('zhao_website_first_truth_categories', (t) => {
      t.increments('id').primary();
      t.string('category', 50).notNullable().unique();
      t.string('label', 100).notNullable();
      t.integer('default_priority').defaultTo(50);
    });
  }
  for (const item of CATEGORIES) {
    await knex('zhao_website_first_truth_categories').insert(item).onConflict('category').ignore();
  }
}

async function down({ db: knex }) {
  await knex('zhao_website_first_truth_categories').del();
}

module.exports = { up, down };
