"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 认证策略（Strapi v5 原生签名）
 * 提取 JWT token，验证并注入 ctx.state.user
 *
 * Strapi v5 策略签名: (policyContext, config, { strapi }) => boolean | void
 * 返回 true/undefined 放行，返回 false 拒绝（403 PolicyError）
 * 注意：不要抛出 @strapi/utils errors，因为插件打包会导致 instanceof 失败
 */
const isAuthenticated = async (policyContext, config, { strapi }) => {
    const authService = strapi.plugin("zhao-auth").service("auth");
    const token = authService.extractToken(policyContext);
    if (!token) {
        return false;
    }
    try {
        const user = await authService.authenticate(token);
        policyContext.state.user = user;
        policyContext.user = user;
        return true;
    }
    catch (e) {
        return false;
    }
};
exports.default = isAuthenticated;
