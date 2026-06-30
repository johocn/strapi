'use strict';

module.exports = {
  /**
   * 为 wealth_risk_metrics 表添加查询优化索引
   * Strapi v5 manyToOne 关系通过关联表实现，主表无 product_id 列，
   * 因此无法创建数据库级唯一约束。唯一性由应用层 delete+create 保证。
   * 此索引加速按日期+周期+指标名的查询。
   */
  async up({ db }) {
    await db.raw(`
      CREATE INDEX IF NOT EXISTS wealth_risk_metrics_lookup_idx
      ON wealth_risk_metrics (snapshot_date, period, metric_name)
    `);
  },

  async down({ db }) {
    await db.raw(`
      DROP INDEX IF EXISTS wealth_risk_metrics_lookup_idx
    `);
  },
};
