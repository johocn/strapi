type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const publicRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false },
});

const userRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.is-authenticated"],
  },
});

const adminRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
    ],
  },
});

const channelScopeRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
    ],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    // ===== 公开路由 =====
    publicRoute("GET", "/point/rules", "point.rules"),
    userRoute("GET", "/point/products", "point.listProducts"),
    userRoute("GET", "/point/products/:id", "point.getProduct"),
    publicRoute("GET", "/point/pickup-locations", "point.listPickupLocations"),
    publicRoute("GET", "/point/pickup-locations/:id", "point.getPickupLocation"),
    publicRoute("GET", "/point/exchange-rate", "point.getExchangeRate"),
    publicRoute("GET", "/point/feature-flags", "point.getFeatureFlags"),

    // ===== 注册用户路由 =====
    userRoute("GET", "/my/point/balance", "point.balance"),
    userRoute("GET", "/my/point/records", "point.records"),
    userRoute("GET", "/my/point/statistics", "point.statistics"),
    userRoute("POST", "/my/point/redeem", "point.redeem"),
    userRoute("GET", "/my/point/redeem/records", "point.redeemRecords"),
    userRoute("POST", "/my/point/verify/qrcode", "point.generateQRCode"),
    userRoute("POST", "/my/point/verify/scan", "point.verifyByQRCode"),
    userRoute("POST", "/my/point/verify/manual", "point.manualVerify"),
    userRoute("GET", "/my/point/verify/log", "point.getMyVerifications"),
    userRoute("GET", "/my/point/eligible-actions", "point.getEligibleActions"),
    userRoute("POST", "/my/point/sign-in", "point.signIn"),
    userRoute("GET", "/my/point/sign-in/status", "point.getSignInStatus"),
    userRoute("GET", "/my/point/tasks", "point.getTasks"),

    // ===== 管理员路由（需渠道作用域） =====
    channelScopeRoute("POST", "/point/earn", "point.earn", "point.grant"),
    channelScopeRoute("POST", "/point/deduct", "point.deduct", "point.grant"),

    // 积分类型
    channelScopeRoute("GET", "/point-types", "point-admin.findTypes", "point-type.read"),
    channelScopeRoute("GET", "/point-types/:documentId", "point-admin.findOneType", "point-type.read"),
    channelScopeRoute("POST", "/point-types", "point-admin.createType", "point-type.create"),
    channelScopeRoute("PUT", "/point-types/:documentId", "point-admin.updateType", "point-type.update"),
    channelScopeRoute("DELETE", "/point-types/:documentId", "point-admin.deleteType", "point-type.delete"),

    // 积分规则
    channelScopeRoute("GET", "/point-rules", "point-admin.findRules", "point-rule.read"),
    channelScopeRoute("GET", "/point-rules/:documentId", "point-admin.findOneRule", "point-rule.read"),
    channelScopeRoute("POST", "/point-rules", "point-admin.createRule", "point-rule.create"),
    channelScopeRoute("PUT", "/point-rules/:documentId", "point-admin.updateRule", "point-rule.update"),
    channelScopeRoute("DELETE", "/point-rules/:documentId", "point-admin.deleteRule", "point-rule.delete"),
    channelScopeRoute("POST", "/point-rules/batch-enable", "point-admin.batchEnableRules", "point-rule.update"),

    // 积分模板
    channelScopeRoute("GET", "/rule-templates", "point-admin.findTemplates", "point-template.read"),
    channelScopeRoute("POST", "/rule-templates", "point-admin.createTemplate", "point-template.create"),
    channelScopeRoute("PUT", "/rule-templates/:documentId", "point-admin.updateTemplate", "point-template.update"),
    channelScopeRoute("DELETE", "/rule-templates/:documentId", "point-admin.deleteTemplate", "point-template.delete"),
    channelScopeRoute("POST", "/rule-templates/:documentId/apply", "point-admin.applyTemplate", "point-template.create"),

    // 积分记录
    channelScopeRoute("GET", "/point-records", "point-admin.findRecords", "point-record.read"),
    channelScopeRoute("GET", "/point-records/:documentId", "point-admin.findOneRecord", "point-record.read"),
    channelScopeRoute("POST", "/point-records/admin-adjust", "point-admin.adminAdjust", "point-record.create"),
    channelScopeRoute("POST", "/point-records/batch-adjust", "point-admin.batchAdjust", "point-record.create"),
    channelScopeRoute("GET", "/point-records/statistics", "point-admin.getRecordStats", "point-record.read"),

    // 积分兑换
    channelScopeRoute("GET", "/point-redemptions", "point-admin.findRedemptions", "point-exchange.read"),
    channelScopeRoute("GET", "/point-redemptions/:documentId", "point-admin.findOneRedemption", "point-exchange.read"),
    channelScopeRoute("PUT", "/point-redemptions/:documentId", "point-admin.updateRedemption", "point-exchange.update"),
    channelScopeRoute("POST", "/point-redemptions/verify-pickup", "point.verifyPickup", "point-exchange.update"),

    // 自提点
    channelScopeRoute("GET", "/pickup-locations", "point-admin.findPickupLocations", "pickup-location.read"),
    channelScopeRoute("GET", "/pickup-locations/:documentId", "point-admin.findOnePickupLocation", "pickup-location.read"),
    channelScopeRoute("POST", "/pickup-locations", "point-admin.createPickupLocation", "pickup-location.create"),
    channelScopeRoute("PUT", "/pickup-locations/:documentId", "point-admin.updatePickupLocation", "pickup-location.update"),
    channelScopeRoute("DELETE", "/pickup-locations/:documentId", "point-admin.deletePickupLocation", "pickup-location.delete"),

    // 积分商品
    channelScopeRoute("GET", "/products", "point-admin.findProducts", "point-product.read"),
    channelScopeRoute("GET", "/products/:documentId", "point-admin.findOneProduct", "point-product.read"),
    channelScopeRoute("POST", "/products", "point-admin.createProduct", "point-product.create"),
    channelScopeRoute("PUT", "/products/:documentId", "point-admin.updateProduct", "point-product.update"),
    channelScopeRoute("DELETE", "/products/:documentId", "point-admin.deleteProduct", "point-product.delete"),
    channelScopeRoute("POST", "/products/:documentId/stock", "point-admin.adjustStock", "point-product.update"),

    // 积分配置
    channelScopeRoute("GET", "/config", "point-admin.getConfig", "point-config.read"),
    channelScopeRoute("PUT", "/config", "point-admin.updateConfig", "point-config.update"),

    // 核销
    channelScopeRoute("GET", "/verifications", "point-admin.findVerifications", "point-verification.read"),
    channelScopeRoute("GET", "/verifications/:documentId", "point-admin.findOneVerification", "point-verification.read"),
    channelScopeRoute("GET", "/verifications/stats", "point-admin.getVerificationStats", "point-verification.read"),

    // 签到记录
    channelScopeRoute("GET", "/sign-in-records", "point-admin.findSignInRecords", "point-record.read"),

    // 仪表盘
    channelScopeRoute("GET", "/dashboard", "point-admin.getDashboard", "point-dashboard.read"),
  ],
});
