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

const memberRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      "plugin::zhao-auth.has-channel-access",
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

/** SSO 远程同步路由：使用 sso-app-auth 签名认证，不走用户认证 */
const ssoSyncRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-channel.sso-app-auth"],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    // ===== 公开路由 =====
    publicRoute("GET", "/channel/public/:id", "channel.getPublic"),
    publicRoute("POST", "/channel/validate/public", "channel.validatePublic"),
    publicRoute("POST", "/channel/register/public", "channel.registerPublic"),

    // ===== 用户路由（需认证） =====
    userRoute("GET", "/my/channels", "channel.find"),
    userRoute("POST", "/my/channel/register", "channel.register"),
    userRoute("POST", "/my/channel/validate", "channel.validate"),
    userRoute("GET", "/my/channels/accessible", "channel-permission.getUserChannels"),
    userRoute("GET", "/my/invite/chain", "user-invite.getMyChain"),
    userRoute("GET", "/my/invite/downstream", "user-invite.getMyDownstream"),
    userRoute("GET", "/my/invite/stats", "user-invite.getMyStats"),

    // ===== 成员路由（需渠道访问权） =====
    memberRoute("GET", "/channel/:id", "channel.findOne"),
    memberRoute("GET", "/channel/:id/network", "channel.getNetwork"),
    memberRoute("GET", "/channel/:id/stats", "channel.getStats"),
    memberRoute("GET", "/channel-members", "channel-member.find"),

    // ===== 渠道管理路由（需功能权限） =====
    channelScopeRoute("POST", "/channel", "channel.create", "channel.create"),
    channelScopeRoute("PUT", "/channel/:id", "channel.update", "channel.update"),
    channelScopeRoute("POST", "/channel-members", "channel-member.create", "channel-member.add"),
    channelScopeRoute("POST", "/permissions/batch-grant", "channel-permission.batchGrant", "channel-permission.set"),
    channelScopeRoute("DELETE", "/channel/:id", "channel.delete", "channel.delete"),

    // ===== 管理端 CRUD 路由（功能权限 + 渠道范围） =====
    channelScopeRoute("GET", "/channels", "channel.adminFind", "channel.read"),
    channelScopeRoute("GET", "/channels/tier-tree/:parentTier", "channel.adminGetTierTree", "channel.read"),
    channelScopeRoute("GET", "/channels/:id/children", "channel.adminGetChildren", "channel.read"),
    channelScopeRoute("GET", "/channels/:id/hierarchy", "channel.adminGetHierarchy", "channel.read"),
    channelScopeRoute("GET", "/channels/:id", "channel.adminFindOne", "channel.read"),
    channelScopeRoute("POST", "/channels", "channel.adminCreate", "channel.create"),
    channelScopeRoute("PUT", "/channels/:id", "channel.adminUpdate", "channel.update"),
    channelScopeRoute("PUT", "/channels/:id/config", "channel.updateConfig", "channel.config.update"),
    channelScopeRoute("DELETE", "/channels/:id", "channel.adminDelete", "channel.delete"),

    channelScopeRoute("GET", "/channel-members", "channel-member.find", "channel-member.read"),
    channelScopeRoute("GET", "/channel-members/:id", "channel-member.findOne", "channel-member.read"),
    channelScopeRoute("POST", "/channel-members", "channel-member.create", "channel-member.add"),
    channelScopeRoute("PUT", "/channel-members/:id", "channel-member.update", "channel-member.add"),
    channelScopeRoute("DELETE", "/channel-members/:id", "channel-member.delete", "channel-member.remove"),

    channelScopeRoute("POST", "/channel-permissions/check", "channel-permission.checkPermission", "channel-permission.set"),
    channelScopeRoute("GET", "/channel-permissions/user/:userId", "channel-permission.getUserChannels", "channel-member.read"),

    channelScopeRoute("GET", "/user-invites", "user-invite.find", "user-invite.send"),
    channelScopeRoute("GET", "/user-invites/:id", "user-invite.findOne", "user-invite.send"),
    channelScopeRoute("POST", "/user-invites", "user-invite.create", "user-invite.send"),
    channelScopeRoute("PUT", "/user-invites/:id", "user-invite.update", "user-invite.send"),
    channelScopeRoute("DELETE", "/user-invites/:id", "user-invite.delete", "channel.delete"),

    // C 端使用邀请码（仅需认证，无需渠道权限）
    userRoute("POST", "/user-invites/use", "user-invite.useInvite"),

    // C 端/Web后台通过渠道邀请码加入渠道（仅需认证）
    userRoute("POST", "/channel-invite/join", "channel-invite.join"),

    // ===== 仪表盘路由 =====
    channelScopeRoute("GET", "/dashboard", "channel-stats.getDashboard", "channel.read"),

    // ===== SSO 远程同步路由（签名认证） =====
    ssoSyncRoute("POST", "/user-invites/sync", "user-invite.syncInvite"),
  ],
});
