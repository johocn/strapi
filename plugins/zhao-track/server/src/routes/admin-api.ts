type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const adminRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-tenant-access",
    ],
  },
});

export default () => ({
  type: "admin" as const,
  routes: [
    adminRoute("POST", "/zhao-track/sync/trigger", "admin-sync.trigger", "zhao-track.sync.trigger"),
    adminRoute("POST", "/zhao-track/attribution/run", "admin-sync.attributionRun", "zhao-track.attribution.run"),
  ],
});
