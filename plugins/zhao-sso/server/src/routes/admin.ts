type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const hasZhaoAuth = () => {
  try {
    const s = (globalThis as any).strapi;
    return !!(s && s.plugin && s.plugin("zhao-auth"));
  } catch {
    return false;
  }
};

const adminRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: hasZhaoAuth()
      ? [
          "plugin::zhao-auth.is-authenticated",
          { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
        ]
      : [
          "plugin::zhao-sso.fallback-authenticated",
          "plugin::zhao-sso.fallback-has-permission",
        ],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    adminRoute("GET", "/dashboard", "admin-controller.dashboard", "sso.dashboard"),
    adminRoute("GET", "/users", "admin-controller.listUsers", "sso.user-read"),
    adminRoute("GET", "/users/:id", "admin-controller.getUser", "sso.user-read"),
    adminRoute("PUT", "/users/:id", "admin-controller.updateUser", "sso.user-update"),
    adminRoute("GET", "/apps", "admin-controller.listApps", "sso.app-read"),
    adminRoute("POST", "/apps", "admin-controller.createApp", "sso.app-create"),
    adminRoute("PUT", "/apps/:id", "admin-controller.updateApp", "sso.app-update"),
    adminRoute("GET", "/channels", "admin-controller.listChannels", "sso.channel-read"),
    adminRoute("POST", "/channels", "admin-controller.createChannel", "sso.channel-create"),
    adminRoute("PUT", "/channels/:id", "admin-controller.updateChannel", "sso.channel-update"),
    adminRoute("GET", "/login-logs", "admin-controller.listLoginLogs", "sso.log-read"),
    adminRoute("GET", "/channel-report", "admin-controller.channelReport", "sso.dashboard"),

    // Token 管理
    adminRoute("GET", "/tokens", "token.list", "sso.token.read"),
    adminRoute("GET", "/tokens/:id", "token.findOne", "sso.token.read"),
    adminRoute("DELETE", "/tokens/:id", "token.delete", "sso.token.delete"),

    // 授权码管理
    adminRoute("GET", "/auth-codes", "auth-code.list", "sso.auth-code.read"),
    adminRoute("GET", "/auth-codes/:id", "auth-code.findOne", "sso.auth-code.read"),
    adminRoute("DELETE", "/auth-codes/:id", "auth-code.delete", "sso.auth-code.delete"),

    // 三方绑定
    adminRoute("GET", "/bindings", "binding.list", "sso.third-party-binding.read"),
    adminRoute("GET", "/bindings/:id", "binding.findOne", "sso.third-party-binding.read"),
    adminRoute("POST", "/bindings", "binding.create", "sso.third-party-binding.create"),
    adminRoute("PUT", "/bindings/:id", "binding.update", "sso.third-party-binding.update"),
    adminRoute("DELETE", "/bindings/:id", "binding.delete", "sso.third-party-binding.delete"),

    // OAuth 配置
    adminRoute("GET", "/oauth-configs", "oauth-config.list", "sso.oauth-config.read"),
    adminRoute("GET", "/oauth-configs/:id", "oauth-config.findOne", "sso.oauth-config.read"),
    adminRoute("POST", "/oauth-configs", "oauth-config.create", "sso.oauth-config.create"),
    adminRoute("PUT", "/oauth-configs/:id", "oauth-config.update", "sso.oauth-config.update"),
    adminRoute("DELETE", "/oauth-configs/:id", "oauth-config.delete", "sso.oauth-config.delete"),

    // 用户应用角色
    adminRoute("GET", "/user-app-roles", "role.list", "sso.user-app-role.read"),
    adminRoute("GET", "/user-app-roles/:id", "role.findOne", "sso.user-app-role.read"),
    adminRoute("POST", "/user-app-roles", "role.create", "sso.user-app-role.create"),
    adminRoute("PUT", "/user-app-roles/:id", "role.update", "sso.user-app-role.update"),
    adminRoute("DELETE", "/user-app-roles/:id", "role.delete", "sso.user-app-role.delete"),

    // 邀请码
    adminRoute("GET", "/invite-codes", "invite-code.list", "sso.invite-code.read"),
    adminRoute("POST", "/invite-codes", "invite-code.create", "sso.invite-code.create"),
    adminRoute("DELETE", "/invite-codes/:id", "invite-code.delete", "sso.invite-code.delete"),
    adminRoute("POST", "/invite-codes/:id/validate", "invite-code.validate", "sso.invite-code.validate"),

    // 邀请记录
    adminRoute("GET", "/invite-usages", "invite-usage.list", "sso.invite-usage.read"),
    adminRoute("DELETE", "/invite-usages/:id", "invite-usage.delete", "sso.invite-usage.delete"),

    // 推荐关系
    adminRoute("GET", "/referral-relations", "referral.list", "sso.referral-relation.read"),
    adminRoute("DELETE", "/referral-relations/:id", "referral.delete", "sso.referral-relation.delete"),

    // 短信验证码
    adminRoute("GET", "/sms-codes", "sms-code.list", "sso.sms-code.read"),
    adminRoute("DELETE", "/sms-codes/:id", "sms-code.delete", "sso.sms-code.delete"),
  ],
});
