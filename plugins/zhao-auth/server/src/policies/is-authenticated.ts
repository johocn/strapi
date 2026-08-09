/**
 * 认证策略（Strapi v5 原生签名）
 * 提取 JWT token，验证并注入 ctx.state.user
 *
 * Strapi v5 策略签名: (policyContext, config, { strapi }) => boolean | void
 * 返回 true/undefined 放行，返回 false 拒绝（403 PolicyError）
 * 注意：不要抛出 @strapi/utils errors，因为插件打包会导致 instanceof 失败
 *
 * 兼容 SSO token：SSO 插件签发的 JWT 用独立 secret，
 * 这里先尝试 zhao-auth 的 secret 验证，失败后再尝试 SSO 的 secret。
 */
const isAuthenticated = async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  try {
    // Strapi v5: policyContext 就是 Koa ctx
    const ctx = policyContext;
    const authHeader =
      ctx?.request?.headers?.authorization ||
      ctx?.headers?.authorization ||
      ctx?.request?.headers?.get?.("authorization");
    if (!authHeader || typeof authHeader !== "string") return false;

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return false;
    const token = parts[1];

    // 先用 zhao-auth 的 JWT service 验证（本地登录 token）
    try {
      const jwtService = strapi.plugin("zhao-auth").service("jwt");
      const decoded = await jwtService.verify(token);
      const authService = strapi.plugin("zhao-auth").service("auth");
      const user = await authService.authenticate(token);
      ctx.state.user = user;
      ctx.user = user;
      return true;
    } catch {
      // zhao-auth 验证失败，尝试 SSO JWT 验证
      try {
        const ssoJwtService = strapi.plugin("zhao-sso")?.service("sso-jwt");
        if (ssoJwtService && typeof ssoJwtService.verifyToken === "function") {
          const ssoPayload = await ssoJwtService.verifyToken(token);
          // SSO token 验证成功：用 sub (uuid) 查 sso_users 表
          if (ssoPayload?.sub) {
            const ssoUser = await strapi.db.query("plugin::zhao-sso.sso-user").findOne({
              where: { uuid: ssoPayload.sub },
            });
            if (ssoUser) {
              const user = {
                id: ssoUser.id,
                documentId: ssoUser.documentId,
                uuid: ssoUser.uuid,
                username: ssoUser.username,
                email: ssoUser.email,
                mobile: ssoUser.mobile,
                roles: ssoPayload.roles || [],
              };
              ctx.state.user = user;
              ctx.user = user;
              return true;
            }
          }
        }
      } catch (ssoErr) {
        // SSO 验证也失败
      }
      return false;
    }
  } catch (e: any) {
    strapi.log.error("[is-authenticated] policy error:", e?.message || e);
    return false;
  }
};

export default isAuthenticated;
