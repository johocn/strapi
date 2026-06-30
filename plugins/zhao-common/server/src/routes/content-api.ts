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
      // 非阻断：注入 ctx.state.channelScope 供控制器过滤
      "plugin::zhao-auth.has-channel-scope",
    ],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    // ===== 公开路由 =====
    publicRoute("GET", "/public/config", "config.getPublic"),

    // ===== 管理端路由 =====
    adminRoute("POST", "/soft-delete/:contentType/:documentId", "soft-delete.softDelete", "soft-delete.manage"),
    adminRoute("POST", "/soft-delete/:contentType/:documentId/restore", "soft-delete.restore", "soft-delete.manage"),
    adminRoute("GET", "/soft-delete/:contentType/deleted", "soft-delete.findDeleted", "soft-delete.read"),
    // 统一配置路由
    adminRoute("GET", "/config/sites", "config.getSiteList", "config.read"),
    adminRoute("GET", "/config/site", "config.getSite", "config.read"),
    adminRoute("GET", "/config/site/:documentId", "config.getSiteOne", "config.read"),
    adminRoute("POST", "/config/site", "config.createSite", "config.create"),
    adminRoute("PUT", "/config/site", "config.updateSite", "config.update"),
    adminRoute("PUT", "/config/site/:documentId", "config.updateSiteById", "config.update"),
    adminRoute("DELETE", "/config/site/:documentId", "config.deleteSite", "config.delete"),
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
    // 模板管理路由
    adminRoute("GET", "/templates", "site-template.list", "template.read"),
    adminRoute("GET", "/templates/:documentId", "site-template.get", "template.read"),
    adminRoute("POST", "/templates", "site-template.create", "template.create"),
    adminRoute("PUT", "/templates/:documentId", "site-template.update", "template.update"),
    adminRoute("DELETE", "/templates/:documentId", "site-template.delete", "template.delete"),
    adminRoute("POST", "/templates/apply", "site-template.applyToSite", "template.update"),
  ],
});
