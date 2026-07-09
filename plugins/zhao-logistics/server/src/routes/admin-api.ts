import type { Core } from "@strapi/strapi";

/**
 * 为指定 CT 生成标准 CRUD 路由
 * 路径前缀：/api/zhao-logistics/v1/admin/{ct-plural}
 */
const createCrudRoutes = (ctName: string, pluralName: string) => [
  {
    method: "GET",
    path: `/v1/admin/${pluralName}`,
    handler: `${ctName}.find`,
    config: {
      // policies: Plan 4 添加权限校验
    },
  },
  {
    method: "GET",
    path: `/v1/admin/${pluralName}/:documentId`,
    handler: `${ctName}.findOne`,
    config: {},
  },
  {
    method: "POST",
    path: `/v1/admin/${pluralName}`,
    handler: `${ctName}.create`,
    config: {},
  },
  {
    method: "PUT",
    path: `/v1/admin/${pluralName}/:documentId`,
    handler: `${ctName}.update`,
    config: {},
  },
  {
    method: "DELETE",
    path: `/v1/admin/${pluralName}/:documentId`,
    handler: `${ctName}.delete`,
    config: {},
  },
];

const routes: Core.Route[] = [
  ...createCrudRoutes("quote-request", "quote-requests"),
  ...createCrudRoutes("quote-field-rule", "quote-field-rules"),
  ...createCrudRoutes("quote-price-rule", "quote-price-rules"),
  ...createCrudRoutes("quote-price-formula", "quote-price-formulas"),
  ...createCrudRoutes("tracking-shipment", "tracking-shipments"),
  ...createCrudRoutes("tracking-node", "tracking-nodes"),
  ...createCrudRoutes("tracking-provider", "tracking-providers"),
  ...createCrudRoutes("contact-matrix", "contact-matrices"),
  // Plan 3 获客成交 CT（8 CT × 5 = 40 端点）
  ...createCrudRoutes("review", "reviews"),
  ...createCrudRoutes("subscription", "subscriptions"),
  ...createCrudRoutes("landing-page", "landing-pages"),
  ...createCrudRoutes("conversion-funnel", "conversion-funnels"),
  ...createCrudRoutes("conversion-event", "conversion-events"),
  ...createCrudRoutes("intent-order", "intent-orders"),
  ...createCrudRoutes("referral", "referrals"),
  ...createCrudRoutes("customer-profile", "customer-profiles"),
  // quote-engine 端点
  {
    method: "POST",
    path: "/v1/admin/quote-engine/calculate",
    handler: "quote-engine.calculate",
    config: {},
  },
  {
    method: "POST",
    path: "/v1/admin/quote-engine/calculate-multi",
    handler: "quote-engine.calculateMulti",
    config: {},
  },
  {
    method: "POST",
    path: "/v1/admin/quote-engine/save-quote",
    handler: "quote-engine.saveQuote",
    config: {},
  },
  // tracking-aggregator 端点
  {
    method: "GET",
    path: "/v1/admin/tracking-aggregator/:trackingNo",
    handler: "tracking-aggregator.getTracking",
    config: {},
  },
  {
    method: "POST",
    path: "/v1/admin/tracking-aggregator/batch",
    handler: "tracking-aggregator.batchTracking",
    config: {},
  },
  {
    method: "POST",
    path: "/v1/admin/tracking-aggregator/:trackingNo/sync",
    handler: "tracking-aggregator.syncFromProvider",
    config: {},
  },
  // review-action 端点
  {
    method: "POST",
    path: "/v1/admin/reviews/:documentId/approve",
    handler: "review-action.approve",
    config: {},
  },
  {
    method: "POST",
    path: "/v1/admin/reviews/:documentId/reject",
    handler: "review-action.reject",
    config: {},
  },
  {
    method: "POST",
    path: "/v1/admin/reviews/:documentId/reply",
    handler: "review-action.reply",
    config: {},
  },
  // intent-order-action 端点
  {
    method: "POST",
    path: "/v1/admin/intent-orders/:documentId/convert",
    handler: "intent-order-action.convert",
    config: {},
  },
  // customer-profile-action 端点
  {
    method: "POST",
    path: "/v1/admin/customer-profiles/merge",
    handler: "customer-profile-action.merge",
    config: {},
  },
  // 统计端点
  {
    method: "GET",
    path: "/v1/admin/funnel/stats",
    handler: "funnel-stats.stats",
    config: {},
  },
  {
    method: "GET",
    path: "/v1/admin/referrals/stats",
    handler: "referral-stats.stats",
    config: {},
  },
  // dynamic-form 端点
  {
    method: "GET",
    path: "/v1/admin/dynamic-form/fields",
    handler: "dynamic-form.loadFields",
    config: {},
  },
  {
    method: "POST",
    path: "/v1/admin/dynamic-form/validate",
    handler: "dynamic-form.validate",
    config: {},
  },
];

export default routes;
