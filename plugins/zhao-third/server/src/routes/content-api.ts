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

const adminRoute = (
  method: Method,
  path: string,
  handler: string,
  permission: string,
) => ({
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
    // C 端公开接口
    publicRoute("POST", "/third/auth-url", "third-party-auth.authUrl"),
    publicRoute("POST", "/third/qrconnect-url", "third-party-auth.qrconnectUrl"),
    publicRoute("POST", "/third/callback", "third-party-auth.callback"),
    publicRoute("GET", "/third/config/:platform/:appType", "third-party-auth.publicConfig"),
    publicRoute("POST", "/third/jssdk-signature", "third-party-auth.jssdkSignature"),

    // C 端需认证接口
    userRoute("POST", "/third/profile/update", "third-party-auth.updateProfile"),

    // 管理端接口
    adminRoute("GET", "/third-party-config", "third-party-config.list", "third-party-config.read"),
    adminRoute("POST", "/third-party-config", "third-party-config.create", "third-party-config.create"),
    adminRoute("PUT", "/third-party-config/:documentId", "third-party-config.update", "third-party-config.update"),
    adminRoute("DELETE", "/third-party-config/:documentId", "third-party-config.delete", "third-party-config.delete"),
    adminRoute("GET", "/third-party-accounts", "third-party-account.list", "third-party-account.read"),
  ],
});
