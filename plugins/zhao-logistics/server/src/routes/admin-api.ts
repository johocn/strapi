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
];

export default routes;
