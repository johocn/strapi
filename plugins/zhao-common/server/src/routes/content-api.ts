type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const publicRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false },
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

export default () => ({
  type: "content-api" as const,
  routes: [
    // ===== 公开路由 =====
    publicRoute("GET", "/site-config", "site-config.getPublic"),
    publicRoute("GET", "/site-config/public", "site-config.getPublic"),
    publicRoute("GET", "/public/config", "config.getPublic"),

    // ===== 管理端路由 =====
    adminRoute("POST", "/soft-delete/:contentType/:documentId", "soft-delete.softDelete", "soft-delete.manage"),
    adminRoute("POST", "/soft-delete/:contentType/:documentId/restore", "soft-delete.restore", "soft-delete.manage"),
    adminRoute("GET", "/soft-delete/:contentType/deleted", "soft-delete.findDeleted", "soft-delete.read"),
    adminRoute("GET", "/site-config", "site-config.get", "site-config.read"),
    adminRoute("PUT", "/site-config", "site-config.update", "site-config.update"),
    // 统一配置路由
    adminRoute("GET", "/config/site", "config.getSite", "config.read"),
    adminRoute("PUT", "/config/site", "config.updateSite", "config.update"),
    adminRoute("GET", "/config/third", "config.getThird", "config.read"),
    adminRoute("GET", "/config/third/:documentId", "config.getThirdOne", "config.read"),
    adminRoute("POST", "/config/third", "config.createThird", "config.create"),
    adminRoute("PUT", "/config/third/:documentId", "config.updateThird", "config.update"),
    adminRoute("DELETE", "/config/third/:documentId", "config.deleteThird", "config.delete"),
    adminRoute("GET", "/config/points", "config.getPoints", "config.read"),
    adminRoute("PUT", "/config/points", "config.updatePoints", "config.update"),
    adminRoute("GET", "/config/oss", "config.getOss", "config.read"),
    adminRoute("PUT", "/config/oss", "config.updateOss", "config.update"),
    adminRoute("GET", "/config/sso", "config.getSso", "config.read"),
    adminRoute("GET", "/config/sso/:documentId", "config.getSsoOne", "config.read"),
    adminRoute("POST", "/config/sso", "config.createSso", "config.create"),
    adminRoute("PUT", "/config/sso/:documentId", "config.updateSso", "config.update"),
    adminRoute("DELETE", "/config/sso/:documentId", "config.deleteSso", "config.delete"),
  ],
});
