'use strict';

module.exports = {
  /**
   * 为 wealth_risk_metrics 表添加复合唯一索引
   * (product_id, snapshot_date, period, metric_name)
   * 防止同日同周期同指标重复写入
   */
  async up(db) {
    await db.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS wealth_risk_metrics_unique_idx
      ON wealth_risk_metrics (product_id, snapshot_date, period, metric_name)
    `);
  },

  async down(db) {
    await db.raw(`
      DROP INDEX IF EXISTS wealth_risk_metrics_unique_idx
    `);
  },
};
