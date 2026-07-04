type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const publicRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.has-channel-scope"],
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
      "plugin::zhao-auth.has-tenant-access",
    ],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    // ===== 公开路由（tag） =====
    publicRoute("GET", "/tags", "tag.find"),
    publicRoute("GET", "/tags/:documentId", "tag.findOne"),
    // ===== 公开路由（knowledge-point） =====
    publicRoute("GET", "/knowledge-points", "knowledge-point.find"),
    publicRoute("GET", "/knowledge-points/:documentId", "knowledge-point.findOne"),

    // ===== 管理路由（tag） =====
    channelScopeRoute("GET", "/tags", "tag.find", "tag.read"),
    channelScopeRoute("GET", "/tags/:documentId", "tag.findOne", "tag.read"),
    channelScopeRoute("POST", "/tags", "tag.create", "tag.create"),
    channelScopeRoute("PUT", "/tags/:documentId", "tag.update", "tag.update"),
    channelScopeRoute("DELETE", "/tags/:documentId", "tag.delete", "tag.delete"),

    // ===== 管理路由（knowledge-point） =====
    channelScopeRoute("GET", "/knowledge-points", "knowledge-point.find", "knowledge-point.read"),
    channelScopeRoute("GET", "/knowledge-points/:documentId", "knowledge-point.findOne", "knowledge-point.read"),
    channelScopeRoute("POST", "/knowledge-points", "knowledge-point.create", "knowledge-point.create"),
    channelScopeRoute("PUT", "/knowledge-points/:documentId", "knowledge-point.update", "knowledge-point.update"),
    channelScopeRoute("DELETE", "/knowledge-points/:documentId", "knowledge-point.delete", "knowledge-point.delete"),

    // ===== 管理路由（tag-index） =====
    channelScopeRoute("GET", "/tag-indexes", "tag-index.find", "tag-index.read"),
    publicRoute("GET", "/tag-indexes/search", "tag-index.search"),
  ],
});
