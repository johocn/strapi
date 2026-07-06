/**
 * SSO 应用认证策略（用于远程 ChannelSync 调用）
 * 验证 X-App-Code + X-Timestamp + X-Signature 请求头
 * 签名算法：HMAC-SHA256(app_code + timestamp + body, app_secret)
 * 签名有效期：5 分钟
 *
 * Strapi v5 规范：返回 true/undefined 放行，返回 false 拒绝（403 PolicyError）
 */
declare const ssoAppAuth: (policyContext: any, config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default ssoAppAuth;
