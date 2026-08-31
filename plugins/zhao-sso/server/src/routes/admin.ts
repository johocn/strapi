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
    adminRoute("GET", "/apps/:id", "admin-controller.getApp", "sso.app-read"),
    adminRoute("PUT", "/apps/:id", "admin-controller.updateApp", "sso.app-update"),
    adminRoute("DELETE", "/apps/:id", "admin-controller.deleteApp", "sso.app-delete"),
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

    // 消息中心
    adminRoute("GET", "/msg-templates", "message.listTemplates", "sso.msg.read"),
    adminRoute("GET", "/msg-templates/:id", "message.getTemplate", "sso.msg.read"),
    adminRoute("POST", "/msg-templates", "message.createTemplate", "sso.msg.write"),
    adminRoute("PUT", "/msg-templates/:id", "message.updateTemplate", "sso.msg.write"),
    adminRoute("DELETE", "/msg-templates/:id", "message.deleteTemplate", "sso.msg.write"),
    adminRoute("GET", "/msg-jobs", "message.listJobs", "sso.msg.read"),
    adminRoute("GET", "/msg-jobs/:id", "message.getJob", "sso.msg.read"),
    adminRoute("POST", "/msg-jobs/anonymous", "message.sendNow", "sso.msg.write"),
    adminRoute("POST", "/msg-jobs/batch", "message.sendBatch", "sso.msg.write"),
    adminRoute("POST", "/msg-jobs/:id/retry", "message.retryJob", "sso.msg.write"),
    adminRoute("GET", "/users/:id/subscribe", "message.refreshSubscribe", "sso.user-read"),

    // 模板版本 / AB 测试
    adminRoute("GET", "/msg-templates/:templateId/versions", "msg-version.list", "sso.msg.read"),
    adminRoute("POST", "/msg-templates/:templateId/versions", "msg-version.create", "sso.msg.write"),
    adminRoute("PUT", "/msg-templates/:templateId/versions/:id", "msg-version.update", "sso.msg.write"),
    adminRoute("DELETE", "/msg-templates/:templateId/versions/:id", "msg-version.delete", "sso.msg.write"),
    adminRoute("POST", "/msg-templates/:templateId/versions/:id/activate", "msg-version.activate", "sso.msg.write"),
    adminRoute("GET", "/msg-templates/:templateId/ab-stats", "msg-version.abStats", "sso.msg.read"),

    // 自动化 SOP 规则
    adminRoute("GET", "/sop-rules", "sop.list", "sso.msg.read"),
    adminRoute("POST", "/sop-rules", "sop.create", "sso.msg.write"),
    adminRoute("PUT", "/sop-rules/:id", "sop.update", "sso.msg.write"),
    adminRoute("DELETE", "/sop-rules/:id", "sop.delete", "sso.msg.write"),
    adminRoute("GET", "/msg/sop-stats", "msg-stats.sopStats", "sso.msg.read"),
    adminRoute("GET", "/msg/repurchase-stats", "msg-stats.repurchaseStats", "sso.msg.read"),
    adminRoute("GET", "/msg/repurchase-leads", "msg-stats.repurchaseLeads", "sso.msg.read"),
    adminRoute("POST", "/msg/repurchase-leads/:id/follow", "msg-stats.updateRepurchaseFollow", "sso.msg.write"),
    adminRoute("GET", "/msg/course-d7-stats", "msg-stats.courseD7Stats", "sso.msg.read"),
    adminRoute("GET", "/msg/course-completion-stats", "msg-stats.courseCompletionStats", "sso.msg.read"),

    // 手动 SOP 待办列表
    adminRoute("GET", "/sop-manual-todos", "sop-manual.list", "sso.msg.read"),
    adminRoute("POST", "/sop-manual-todos/:id/dispatch", "sop-manual.dispatch", "sso.msg.write"),
    adminRoute("POST", "/sop-manual-todos/:id/skip", "sop-manual.skip", "sso.msg.write"),

    // 用户画像分层
    adminRoute("GET", "/profiles", "profile.list", "sso.profile.read"),
    adminRoute("GET", "/profiles/:id", "profile.detail", "sso.profile.read"),
    adminRoute("POST", "/profiles/recalc-all", "profile.recalcAll", "sso.profile.write"),

    // 公众号接入配置（读 extra_config / 服务器配置）
    adminRoute("GET", "/wx/server-config", "wx-callback.serverConfig", "sso.wx.config"),

    // 带参二维码
    adminRoute("GET", "/wx/qrcodes", "wx-qrcode.list", "sso.wx.read"),
    adminRoute("POST", "/wx/qrcodes", "wx-qrcode.create", "sso.wx.write"),
    adminRoute("GET", "/wx/qrcodes/:id", "wx-qrcode.findOne", "sso.wx.read"),
    adminRoute("DELETE", "/wx/qrcodes/:id", "wx-qrcode.delete", "sso.wx.write"),
    adminRoute("GET", "/wx/events", "wx-qrcode.events", "sso.wx.read"),

    // 自定义菜单
    adminRoute("GET", "/wx/menus", "wx-menu.list", "sso.wx.read"),
    adminRoute("POST", "/wx/menus", "wx-menu.create", "sso.wx.write"),
    adminRoute("PUT", "/wx/menus/:id", "wx-menu.update", "sso.wx.write"),
    adminRoute("DELETE", "/wx/menus/:id", "wx-menu.delete", "sso.wx.write"),
    adminRoute("POST", "/wx/menus/:id/publish", "wx-menu.publish", "sso.wx.write"),
    adminRoute("GET", "/wx/menu/remote", "wx-menu.getRemote", "sso.wx.read"),
    adminRoute("DELETE", "/wx/menu/remote", "wx-menu.deleteRemote", "sso.wx.write"),

    // 关键字回复
    adminRoute("GET", "/wx/replies", "wx-reply.list", "sso.wx.read"),
    adminRoute("POST", "/wx/replies", "wx-reply.create", "sso.wx.write"),
    adminRoute("PUT", "/wx/replies/:id", "wx-reply.update", "sso.wx.write"),
    adminRoute("DELETE", "/wx/replies/:id", "wx-reply.delete", "sso.wx.write"),

    // 永久素材
    adminRoute("POST", "/wx/materials", "wx-material.create", "sso.wx.write"),
    adminRoute("GET", "/wx/materials", "wx-material.list", "sso.wx.read"),
    adminRoute("DELETE", "/wx/materials/:id", "wx-material.delete", "sso.wx.write"),

    // 图文草稿 + 发布
    adminRoute("POST", "/wx/articles", "wx-article.create", "sso.wx.write"),
    adminRoute("GET", "/wx/articles", "wx-article.list", "sso.wx.read"),
    adminRoute("GET", "/wx/articles/:id", "wx-article.findOne", "sso.wx.read"),
    adminRoute("PUT", "/wx/articles/:id", "wx-article.update", "sso.wx.write"),
    adminRoute("POST", "/wx/articles/:id/publish", "wx-article.publish", "sso.wx.write"),
    adminRoute("GET", "/wx/articles/:id/status", "wx-article.status", "sso.wx.read"),
    adminRoute("DELETE", "/wx/articles/:id", "wx-article.delete", "sso.wx.write"),

    // 模板消息终端列表（只读，复用 sso.msg.read）
    adminRoute("GET", "/wx/templates", "wx-menu.listTemplates", "sso.msg.read"),
  ],
});
