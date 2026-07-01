'use strict';

module.exports = {
  async up({ db }) {
    // 检查列是否已存在（幂等）
    const columns = await db.raw(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'wealth_products' AND column_name IN ('benchmark', 'remark')"
    );

    const existing = columns.rows.map(r => r.column_name);

    if (!existing.includes('benchmark')) {
      await db.raw(`ALTER TABLE wealth_products ADD COLUMN benchmark VARCHAR(255)`);
    }

    if (!existing.includes('remark')) {
      await db.raw(`ALTER TABLE wealth_products ADD COLUMN remark TEXT`);
    }
  },

  async down({ db }) {
    await db.raw(`ALTER TABLE wealth_products DROP COLUMN IF EXISTS remark`);
    await db.raw(`ALTER TABLE wealth_products DROP COLUMN IF EXISTS benchmark`);
  },
};
