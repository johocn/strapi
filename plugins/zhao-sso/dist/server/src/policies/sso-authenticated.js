"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * SSO 认证策略（Strapi v5 原生签名）
 * 验证 SSO Bearer token，注入 ssoUser 到 policyContext.state
 * 返回 true/undefined 放行，返回 false 拒绝（403 PolicyError）
 */
const ssoAuthenticated = async (policyContext, config, { strapi }) => {
    var _a, _b;
    const authHeader = (_b = (_a = policyContext.request) === null || _a === void 0 ? void 0 : _a.headers) === null || _b === void 0 ? void 0 : _b.authorization;
    if (!authHeader || typeof authHeader !== "string") {
        return false;
    }
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return false;
    }
    try {
        const jwtService = strapi.plugin("zhao-sso").service("sso-jwt");
        const payload = await jwtService.verifyToken(parts[1]);
        if (payload.type !== "access") {
            return false;
        }
        const tokenRecord = await strapi.db.query("plugin::zhao-sso.sso-token").findOne({
            where: { access_token_jti: payload.jti },
        });
        if (tokenRecord === null || tokenRecord === void 0 ? void 0 : tokenRecord.revoked) {
            return false;
        }
        policyContext.state.ssoUser = payload;
        policyContext.state.ssoToken = parts[1];
        return true;
    }
    catch {
        return false;
    }
};
exports.default = ssoAuthenticated;
