'use strict';

module.exports = {
  /**
   * 给 wealth_products 表新增 recommend_enabled / recommend_reason 列
   * 并从 wealth_recommend_configs 回填已有推荐数据到 product 表
   * 注意：wealth_recommend_configs 与 product 是 oneToOne 关系，
   * Strapi v5 关联表名需实际确认，这里先尝试常见命名，失败则跳过数据迁移
   */
  async up({ db }) {
    // 1. 检查并新增 recommend_enabled 列
    const hasEnabledCol = await db.raw(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'wealth_products' AND column_name = 'recommend_enabled'
    `);
    if (hasEnabledCol.rows.length === 0) {
      await db.raw(`
        ALTER TABLE wealth_products
        ADD COLUMN recommend_enabled BOOLEAN DEFAULT FALSE
      `);
    }

    // 2. 检查并新增 recommend_reason 列
    const hasReasonCol = await db.raw(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'wealth_products' AND column_name = 'recommend_reason'
    `);
    if (hasReasonCol.rows.length === 0) {
      await db.raw(`
        ALTER TABLE wealth_products
        ADD COLUMN recommend_reason TEXT
      `);
    }

    // 3. 从 wealth_recommend_configs 回填数据到 product 表
    // 先查询关联表是否存在，动态获取关联表名
    const tables = await db.raw(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name LIKE 'wealth_recommend_configs%_lnk'
        OR table_name LIKE 'wealth_recommend_configs_product%'
    `);

    if (tables.rows.length > 0) {
      const linkTable = tables.rows[0].table_name;
      // 查询关联表列名
      const cols = await db.raw(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = ?
      `, [linkTable]);

      const colNames = cols.rows.map((r: any) => r.column_name);
      const configCol = colNames.find((c: string) => c.includes('recommend_config')) || colNames[0];
      const productCol = colNames.find((c: string) => c.includes('product')) || colNames[1];

      const configs = await db.raw(`
        SELECT
          p.id AS product_id,
          rc.recommend_order,
          rc.recommend_reason,
          rc.status
        FROM wealth_recommend_configs rc
        JOIN "${linkTable}" lnk ON lnk."${configCol}" = rc.id
        JOIN wealth_products p ON p.id = lnk."${productCol}"
        WHERE rc.status = true
      `);

      for (const row of configs.rows) {
        await db.raw(`
          UPDATE wealth_products
          SET recommend_enabled = true,
              recommend_reason = COALESCE(?, recommend_reason),
              recommend_weight = COALESCE(?, recommend_weight)
          WHERE id = ?
        `, [row.recommend_reason, row.recommend_order, row.product_id]);
      }
    }
  },

  async down({ db }) {
    await db.raw(`ALTER TABLE wealth_products DROP COLUMN IF EXISTS recommend_reason`);
    await db.raw(`ALTER TABLE wealth_products DROP COLUMN IF EXISTS recommend_enabled`);
  },
};
