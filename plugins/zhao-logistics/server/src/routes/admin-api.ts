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
