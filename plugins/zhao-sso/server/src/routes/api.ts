export default () => ({
  type: "content-api" as const,
  routes: [
    // ===== 公开路由 =====
    {
      method: "POST",
      path: "/v1/auth/login",
      handler: "auth-controller.login",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/v1/auth/register",
      handler: "auth-controller.register",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/v1/auth/refresh",
      handler: "auth-controller.refresh",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/v1/auth/authorize",
      handler: "oauth-controller.authorize",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/v1/auth/token",
      handler: "oauth-controller.token",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/v1/auth/wechat",
      handler: "oauth-controller.wechatRedirect",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/v1/auth/wechat/callback",
      handler: "oauth-controller.wechatCallback",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/v1/auth/alipay",
      handler: "oauth-controller.alipayRedirect",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/v1/auth/alipay/callback",
      handler: "oauth-controller.alipayCallback",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/v1/channel/track",
      handler: "channel-controller.track",
      config: { auth: false },
    },

    // ===== SSO 认证路由 =====
    {
      method: "POST",
      path: "/v1/auth/verify",
      handler: "auth-controller.verify",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"],
      },
    },
    {
      method: "POST",
      path: "/v1/auth/logout",
      handler: "auth-controller.logout",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"],
      },
    },
    {
      method: "GET",
      path: "/v1/user/me",
      handler: "user-controller.me",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"],
      },
    },
    {
      method: "POST",
      path: "/v1/user/bind",
      handler: "user-controller.bind",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"],
      },
    },
    {
      method: "POST",
      path: "/v1/user/unbind",
      handler: "user-controller.unbind",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"],
      },
    },
    {
      method: "POST",
      path: "/v1/user/change-password",
      handler: "user-controller.changePassword",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"],
      },
    },
  ],
});
