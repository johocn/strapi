'use strict';

module.exports = {
  async up({ db }) {
    // tracking_shipments: (site_id, tracking_no) UNIQUE
    await db.schema.alterTable('zhao_logistics_tracking_shipments', (table) => {
      table.unique(['site_id', 'tracking_no']);
    });

    // referrals 预留（Plan 3 创建表后生效）
    // customer_profiles 预留（Plan 3 创建表后生效）
    // landing_pages 预留（Plan 3 创建表后生效）

    // quote_requests: (site_id, route_id, status, created_at) 普通索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_quote_requests_site_route_status
      ON zhao_logistics_quote_requests (site_id, route_id, status, created_at)
      WHERE deleted_at IS NULL`);

    // tracking_nodes: (site_id, shipment_id, event_time) 普通索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_tracking_nodes_site_shipment_time
      ON zhao_logistics_tracking_nodes (site_id, shipment_id, event_time)
      WHERE deleted_at IS NULL`);

    // quote_price_rules: (site_id, route_id, service_provider, min_weight, max_weight) 普通索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_quote_price_rules_match
      ON zhao_logistics_quote_price_rules (site_id, route_id, service_provider, min_weight, max_weight)
      WHERE deleted_at IS NULL AND is_active = true`);

    // quote_field_rules: (site_id, is_active, priority) 普通索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_quote_field_rules_match
      ON zhao_logistics_quote_field_rules (site_id, is_active, priority DESC)
      WHERE deleted_at IS NULL`);
  },

  async down({ db }) {
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_quote_requests_site_route_status`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_tracking_nodes_site_shipment_time`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_quote_price_rules_match`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_quote_field_rules_match`);
    await db.schema.alterTable('zhao_logistics_tracking_shipments', (table) => {
      table.dropUnique(['site_id', 'tracking_no']);
    });
  },
};
