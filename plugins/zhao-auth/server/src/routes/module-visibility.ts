type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const adminRoute = (
  method: Method,
  path: string,
  handler: string,
  permission: string
) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      "plugin::zhao-auth.tenant-context-injector",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
    ],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    adminRoute("GET", "/module-visibility", "module-visibility.get", "menu.module-visibility"),
    adminRoute("PUT", "/module-visibility", "module-visibility.update", "menu.module-visibility"),
  ],
});
