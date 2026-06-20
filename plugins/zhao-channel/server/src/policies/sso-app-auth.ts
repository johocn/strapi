import * as crypto from "crypto";

/**
 * SSO 应用认证策略（用于远程 ChannelSync 调用）
 * 验证 X-App-Code + X-Timestamp + X-Signature 请求头
 * 签名算法：HMAC-SHA256(app_code + timestamp + body, app_secret)
 * 签名有效期：5 分钟
 *
 * Strapi v5 规范：返回 true/undefined 放行，返回 false 拒绝（403 PolicyError）
 */
const ssoAppAuth = async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  const appCode = policyContext.request?.headers?.["x-app-code"];
  const timestamp = policyContext.request?.headers?.["x-timestamp"];
  const signature = policyContext.request?.headers?.["x-signature"];

  if (!appCode || !timestamp || !signature) {
    return false;
  }

  // 检查时间戳有效期（5 分钟）
  const now = Date.now();
  const ts = Number(timestamp);
  if (isNaN(ts) || Math.abs(now - ts) > 5 * 60 * 1000) {
    return false;
  }

  // 查找 SSO 应用配置中的 appSecret
  // 从 zhao-sso 插件配置的 channelSync.appCode/appSecret 匹配
  // 或从 sso-app content-type 查找
  let appSecret: string | undefined;

  // 优先从 sso-app content-type 查找
  try {
    const ssoApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
      where: { app_code: appCode },
    });
    if (ssoApp?.app_secret && ssoApp.is_active !== false) {
      appSecret = ssoApp.app_secret;
    }
  } catch {
    // sso-app content-type 可能不存在，回退到插件配置
  }

  // 回退：从 zhao-sso 插件配置查找
  if (!appSecret) {
    const ssoConfig = strapi.config.get("plugin::zhao-sso.channelSync") || strapi.plugin("zhao-sso")?.config("channelSync");
    if (ssoConfig?.appCode === appCode && ssoConfig?.appSecret) {
      appSecret = ssoConfig.appSecret;
    }
  }

  if (!appSecret) {
    return false;
  }

  // 验证签名
  const body = policyContext.request?.body ? JSON.stringify(policyContext.request.body) : "";
  const expectedSig = crypto
    .createHmac("sha256", appSecret)
    .update(`${appCode}${timestamp}${body}`)
    .digest("hex");

  if (signature !== expectedSig) {
    return false;
  }

  // 注入 appCode 到 context 供后续使用
  policyContext.state.appCode = appCode;
  return true;
};

export default ssoAppAuth;
