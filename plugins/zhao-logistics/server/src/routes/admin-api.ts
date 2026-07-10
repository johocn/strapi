type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * 管理后台路由辅助函数
 * 参照 zhao-studio 规范：auth:false + 四件套策略
 * 1. is-authenticated  校验登录态
 * 2. has-permission    校验细粒度权限
 * 3. has-channel-scope 渠道范围校验
 * 4. has-tenant-access 租户隔离校验
 */
const adminRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-auth.has-tenant-access",
    ],
  },
});

type CrudAction = "find" | "findOne" | "create" | "update" | "delete";

/**
 * CRUD 路由工厂
 * @param ctName      控制器名（如 "quote-request"）
 * @param pluralName  路由复数名（如 "quote-requests"）
 * @param permPrefix  权限键前缀（如 "logistics.quote-request"）
 * @param actionMap   覆盖默认动作→权限后缀映射（用于缺键 CT 复用已有键）
 */
const createCrudRoutes = (
  ctName: string,
  pluralName: string,
  permPrefix: string,
  actionMap: Partial<Record<CrudAction, string>> = {}
) => {
  // 默认：find/findOne→read, create→create, update→update, delete→delete
  const permFor = (action: CrudAction): string => {
    const suffix = actionMap[action];
    if (suffix) return suffix.startsWith("logistics.") ? suffix : `${permPrefix}.${suffix}`;
    const defaultSuffix = action === "find" || action === "findOne" ? "read" : action;
    return `${permPrefix}.${defaultSuffix}`;
  };

  return [
    adminRoute("GET", `/${pluralName}`, `${ctName}-admin.find`, permFor("find")),
    adminRoute("GET", `/${pluralName}/:documentId`, `${ctName}-admin.findOne`, permFor("findOne")),
    adminRoute("POST", `/${pluralName}`, `${ctName}-admin.create`, permFor("create")),
    adminRoute("PUT", `/${pluralName}/:documentId`, `${ctName}-admin.update`, permFor("update")),
    adminRoute("DELETE", `/${pluralName}/:documentId`, `${ctName}-admin.delete`, permFor("delete")),
  ];
};

const routes = [
  // ===== 16 个 CT CRUD =====
  ...createCrudRoutes("quote-request", "quote-requests", "logistics.quote-request"),
  ...createCrudRoutes("quote-field-rule", "quote-field-rules", "logistics.quote-field-rule"),
  ...createCrudRoutes("quote-price-rule", "quote-price-rules", "logistics.quote-price-rule"),
  ...createCrudRoutes("quote-price-formula", "quote-price-formulas", "logistics.quote-price-formula"),
  ...createCrudRoutes("tracking-shipment", "tracking-shipments", "logistics.tracking-shipment"),
  ...createCrudRoutes("tracking-node", "tracking-nodes", "logistics.tracking-node"),
  ...createCrudRoutes("tracking-provider", "tracking-providers", "logistics.tracking-provider"),
  ...createCrudRoutes("contact-matrix", "contact-matrices", "logistics.contact-matrix"),
  ...createCrudRoutes("review", "reviews", "logistics.review"),
  // subscription.create 缺，复用 .update
  ...createCrudRoutes("subscription", "subscriptions", "logistics.subscription", { create: "update" }),
  ...createCrudRoutes("landing-page", "landing-pages", "logistics.landing-page"),
  ...createCrudRoutes("conversion-funnel", "conversion-funnels", "logistics.conversion-funnel"),
  // conversion-event 仅 read，create/update/delete 复用 .read
  ...createCrudRoutes("conversion-event", "conversion-events", "logistics.conversion-event", {
    create: "read",
    update: "read",
    delete: "read",
  }),
  ...createCrudRoutes("intent-order", "intent-orders", "logistics.intent-order"),
  ...createCrudRoutes("referral", "referrals", "logistics.referral"),
  // customer-profile.create 缺，复用 .update
  ...createCrudRoutes("customer-profile", "customer-profiles", "logistics.customer-profile", { create: "update" }),

  // ===== 15 个自定义动作 =====
  // 报价引擎（属询价管理域，复用 quote-request.update）
  adminRoute("POST", "/quote-engine/calculate", "quote-engine-admin.calculate", "logistics.quote-request.update"),
  adminRoute("POST", "/quote-engine/calculate-multi", "quote-engine-admin.calculateMulti", "logistics.quote-request.update"),
  adminRoute("POST", "/quote-engine/save-quote", "quote-engine-admin.saveQuote", "logistics.quote-request.update"),

  // 运单聚合（属运单域，查询复用 tracking-shipment.read，同步属写操作复用 .update）
  adminRoute("GET", "/tracking-aggregator/:trackingNo", "tracking-aggregator-admin.getTracking", "logistics.tracking-shipment.read"),
  adminRoute("POST", "/tracking-aggregator/batch", "tracking-aggregator-admin.batchTracking", "logistics.tracking-shipment.read"),
  adminRoute("POST", "/tracking-aggregator/:trackingNo/sync", "tracking-aggregator-admin.syncFromProvider", "logistics.tracking-shipment.update"),

  // 评价审核（approve/reject/reply 统一归 review.approve）
  adminRoute("POST", "/reviews/:documentId/approve", "review-action-admin.approve", "logistics.review.approve"),
  adminRoute("POST", "/reviews/:documentId/reject", "review-action-admin.reject", "logistics.review.approve"),
  adminRoute("POST", "/reviews/:documentId/reply", "review-action-admin.reply", "logistics.review.approve"),

  // 意向订单转化
  adminRoute("POST", "/intent-orders/:documentId/convert", "intent-order-action-admin.convert", "logistics.intent-order.convert"),

  // 客户档案合并
  adminRoute("POST", "/customer-profiles/merge", "customer-profile-action-admin.merge", "logistics.customer-profile.merge"),

  // 统计（注意：funnels 复数，与前端 logistics.js 对齐）
  adminRoute("GET", "/funnels/stats", "funnel-stats-admin.stats", "logistics.funnel-stats.read"),
  adminRoute("GET", "/referrals/stats", "referral-stats-admin.stats", "logistics.referral-stats.read"),

  // 动态表单（属询价域，复用 quote-request.read）
  adminRoute("GET", "/dynamic-form/fields", "dynamic-form-admin.loadFields", "logistics.quote-request.read"),
  adminRoute("POST", "/dynamic-form/validate", "dynamic-form-admin.validate", "logistics.quote-request.read"),
];

export default routes;
