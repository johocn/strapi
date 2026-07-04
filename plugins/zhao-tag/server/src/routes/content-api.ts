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

    // ===== 管理路由（tag） =====
    channelScopeRoute("GET", "/tags", "tag.find", "tag.read"),
    channelScopeRoute("GET", "/tags/:documentId", "tag.findOne", "tag.read"),
    channelScopeRoute("POST", "/tags", "tag.create", "tag.create"),
    channelScopeRoute("PUT", "/tags/:documentId", "tag.update", "tag.update"),
    channelScopeRoute("DELETE", "/tags/:documentId", "tag.delete", "tag.delete"),

    // ===== 公开路由（tag-group） =====
    publicRoute("GET", "/tag-groups", "tag-group.find"),
    publicRoute("GET", "/tag-groups/:documentId", "tag-group.findOne"),

    // ===== 管理路由（tag-group） =====
    channelScopeRoute("GET", "/tag-groups", "tag-group.find", "tag-group.read"),
    channelScopeRoute("GET", "/tag-groups/:documentId", "tag-group.findOne", "tag-group.read"),
    channelScopeRoute("POST", "/tag-groups", "tag-group.create", "tag-group.create"),
    channelScopeRoute("PUT", "/tag-groups/:documentId", "tag-group.update", "tag-group.update"),
    channelScopeRoute("DELETE", "/tag-groups/:documentId", "tag-group.delete", "tag-group.delete"),

    // ===== 管理路由（tag-index） =====
    channelScopeRoute("GET", "/tag-indexes", "tag-index.find", "tag-index.read"),
    publicRoute("GET", "/tag-indexes/search", "tag-index.search"),
  ],
});
