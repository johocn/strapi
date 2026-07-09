'use strict';

module.exports = {
  async up({ db }) {
    // referrals: (site_id, referral_code) UNIQUE — 推荐码唯一约束
    await db.schema.alterTable('zhao_logistics_referrals', (table) => {
      table.unique(['site_id', 'referral_code']);
    });

    // conversion_events: (site_id, funnel_id, occurred_at) — 漏斗事件时间线查询
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_conversion_events_funnel_time
      ON zhao_logistics_conversion_events (site_id, funnel_id, occurred_at)
      WHERE deleted_at IS NULL`);

    // conversion_events: (site_id, visitor_id, occurred_at) — 访客行为路径查询
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_conversion_events_visitor_time
      ON zhao_logistics_conversion_events (site_id, visitor_id, occurred_at)
      WHERE deleted_at IS NULL`);

    // customer_profiles: (site_id, contact_phone) — 按电话查询客户档案
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_customer_profiles_phone
      ON zhao_logistics_customer_profiles (site_id, contact_phone)
      WHERE deleted_at IS NULL`);

    // landing_pages: (site_id, slug) — 按 slug 查询落地页
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_landing_pages_slug
      ON zhao_logistics_landing_pages (site_id, slug)
      WHERE deleted_at IS NULL`);

    // intent_orders: (site_id, status, created_at) — 按状态查询意向单
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_intent_orders_status
      ON zhao_logistics_intent_orders (site_id, status, created_at)
      WHERE deleted_at IS NULL`);

    // reviews: (site_id, status, is_featured) — 精选评价查询
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_reviews_featured
      ON zhao_logistics_reviews (site_id, status, is_featured)
      WHERE deleted_at IS NULL`);

    // subscriptions: (site_id, channel_target, subscriber_type) — 订阅目标查询
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_subscriptions_target
      ON zhao_logistics_subscriptions (site_id, channel_target, subscriber_type)
      WHERE deleted_at IS NULL`);

    // conversion_funnels: (site_id, is_active) — 活跃漏斗查询
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_logistics_conversion_funnels_active
      ON zhao_logistics_conversion_funnels (site_id, is_active)
      WHERE deleted_at IS NULL`);
  },

  async down({ db }) {
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_conversion_events_funnel_time`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_conversion_events_visitor_time`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_customer_profiles_phone`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_landing_pages_slug`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_intent_orders_status`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_reviews_featured`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_subscriptions_target`);
    await db.raw(`DROP INDEX IF EXISTS idx_logistics_conversion_funnels_active`);
    await db.schema.alterTable('zhao_logistics_referrals', (table) => {
      table.dropUnique(['site_id', 'referral_code']);
    });
  },
};
