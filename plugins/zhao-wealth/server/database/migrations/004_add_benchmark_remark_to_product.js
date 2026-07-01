'use strict';

async function up({ db }) {
  const knex = db.connection;

  // 检查列是否已存在（幂等）
  const columns = await knex.raw(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'wealth_products' AND column_name IN ('benchmark', 'remark')"
  );

  const existing = columns.rows.map(r => r.column_name);

  if (!existing.includes('benchmark')) {
    await knex.schema.alterTable('wealth_products', (table) => {
      table.string('benchmark').nullable();
    });
  }

  if (!existing.includes('remark')) {
    await knex.schema.alterTable('wealth_products', (table) => {
      table.text('remark').nullable();
    });
  }
}

async function down({ db }) {
  const knex = db.connection;
  await knex.schema.alterTable('wealth_products', (table) => {
    table.dropColumn('benchmark');
    table.dropColumn('remark');
  });
}

module.exports = { up, down };
