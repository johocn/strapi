type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type Allow = "read" | "full" | "storage" | "payment";

const adminRoute = (
  method: Method,
  path: string,
  handler: string,
  allow: Allow
) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      { name: "plugin::zhao-tire.admin-role", config: { allow } },
    ],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    // 当前操作员
    adminRoute("GET", "/me", "admin-me.find", "read"),

    // 订单
    adminRoute("GET", "/orders", "admin-order.find", "read"),
    adminRoute(
      "GET",
      "/orders/export.xlsx",
      "admin-order.exportExcel",
      "full"
    ),
    adminRoute("GET", "/orders/:id", "admin-order.findOne", "read"),
    adminRoute("PATCH", "/orders/:id", "admin-order.update", "full"),
    adminRoute("POST", "/orders/:id/accept", "admin-order.accept", "full"),
    adminRoute("POST", "/orders/:id/reject", "admin-order.reject", "full"),
    adminRoute(
      "POST",
      "/orders/:id/inbound",
      "admin-order.inbound",
      "storage"
    ),
    adminRoute(
      "POST",
      "/orders/:id/outbound",
      "admin-order.outbound",
      "storage"
    ),
    adminRoute("POST", "/orders/:id/payment", "admin-order.payment", "payment"),
    adminRoute("POST", "/orders/:id/refund", "admin-order.refund", "full"),
    adminRoute(
      "POST",
      "/orders/:id/approve-outbound",
      "admin-order.approveOutbound",
      "full"
    ),
    adminRoute(
      "POST",
      "/orders/:id/reject-outbound",
      "admin-order.rejectOutbound",
      "full"
    ),

    // 支付流水 / 确认到账
    adminRoute("GET", "/payments", "admin-payment.find", "read"),
    adminRoute("POST", "/payments/:id/confirm", "admin-payment.confirm", "payment"),

    // 库存
    adminRoute("GET", "/inventory", "admin-inventory.find", "read"),
    adminRoute(
      "GET",
      "/inventory/expiring",
      "admin-inventory.expiring",
      "read"
    ),
    adminRoute(
      "POST",
      "/inventory/remind",
      "admin-inventory.remind",
      "full"
    ),

    // 客户
    adminRoute("GET", "/customers", "admin-customer.find", "full"),

    // 套餐 / 增值服务
    adminRoute("GET", "/packages", "admin-catalog.packageList", "full"),
    adminRoute("POST", "/packages", "admin-catalog.packageCreate", "full"),
    adminRoute(
      "PUT",
      "/packages/:id",
      "admin-catalog.packageUpdate",
      "full"
    ),
    adminRoute(
      "DELETE",
      "/packages/:id",
      "admin-catalog.packageRemove",
      "full"
    ),
    adminRoute("GET", "/addons", "admin-catalog.addonList", "full"),
    adminRoute("POST", "/addons", "admin-catalog.addonCreate", "full"),
    adminRoute("PUT", "/addons/:id", "admin-catalog.addonUpdate", "full"),
    adminRoute(
      "DELETE",
      "/addons/:id",
      "admin-catalog.addonRemove",
      "full"
    ),

    // 站点配置
    adminRoute("GET", "/config", "admin-catalog.getConfig", "full"),
    adminRoute("PUT", "/config", "admin-catalog.updateConfig", "full"),

    // 内容
    adminRoute("GET", "/faqs", "admin-content.faqList", "full"),
    adminRoute("POST", "/faqs", "admin-content.faqCreate", "full"),
    adminRoute("PUT", "/faqs/:id", "admin-content.faqUpdate", "full"),
    adminRoute("DELETE", "/faqs/:id", "admin-content.faqRemove", "full"),
    adminRoute("GET", "/reviews", "admin-content.reviewList", "full"),
    adminRoute("POST", "/reviews", "admin-content.reviewCreate", "full"),
    adminRoute("PUT", "/reviews/:id", "admin-content.reviewUpdate", "full"),
    adminRoute(
      "DELETE",
      "/reviews/:id",
      "admin-content.reviewRemove",
      "full"
    ),
    adminRoute("GET", "/gallery", "admin-content.galleryList", "full"),
    adminRoute("POST", "/gallery", "admin-content.galleryCreate", "full"),
    adminRoute("PUT", "/gallery/:id", "admin-content.galleryUpdate", "full"),
    adminRoute(
      "DELETE",
      "/gallery/:id",
      "admin-content.galleryRemove",
      "full"
    ),

    // 邀请码管理
    adminRoute("GET", "/referral-codes", "admin-referral.find", "full"),
    adminRoute("PATCH", "/referral-codes/:id", "admin-referral.update", "full"),
    adminRoute("POST", "/referral-codes/:id/grant-free", "admin-referral.grantFree", "full"),
    adminRoute("GET", "/share-records", "admin-referral.shareRecords", "read"),
    adminRoute(
      "GET",
      "/share-records/export.csv",
      "admin-referral.exportShareRecords",
      "read"
    ),
    adminRoute("GET", "/rewards", "admin-referral.rewards", "read"),

    // 短信通知
    adminRoute("GET", "/sms-logs", "admin-sms.find", "full"),
    adminRoute("PATCH", "/sms-logs/:id", "admin-sms.update", "full"),
  ],
});
