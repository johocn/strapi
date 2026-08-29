/**
 * SSO 认证策略（Strapi v5 原生签名）
 * 验证 SSO Bearer token，注入 ssoUser 到 policyContext.state
 * 鉴权失败（缺失/格式错误/过期/无效/已注销 access token）抛 401；
 * 真 403 由控制器内权限校验（e.status=403）负责，本策略只判"是否已认证"不判权限。
 */
const ssoAuthenticated = async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  const authHeader = policyContext.request?.headers?.authorization;

  const reject401 = () => {
    const err: any = new Error("未登录或登录已过期");
    err.status = 401;
    throw err;
  };

  if (!authHeader || typeof authHeader !== "string") {
    reject401();
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    reject401();
  }

  try {
    const jwtService = strapi.plugin("zhao-sso").service("sso-jwt");
    const payload = await jwtService.verifyToken(parts[1]);

    if (payload.type !== "access") {
      reject401();
    }

    const tokenRecord = await strapi.db.query("plugin::zhao-sso.sso-token").findOne({
      where: { access_token_jti: payload.jti },
    });
    if (tokenRecord?.revoked) {
      reject401();
    }

    policyContext.state.ssoUser = payload;
    policyContext.state.ssoToken = parts[1];
    return true;
  } catch (e: any) {
    // verifyToken 抛错（过期/签名不符）同样视为未认证 → 401
    if (e && e.status === 401) throw e;
    reject401();
  }
};

export default ssoAuthenticated;
