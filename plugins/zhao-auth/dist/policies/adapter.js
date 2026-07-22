"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaptPolicy = adaptPolicy;
/**
 * 将自定义 PolicyHandler 适配为 Strapi v5 原生 PolicyHandler 签名
 * 返回 true/undefined 放行，返回 false 拒绝（403 PolicyError）
 */
function adaptPolicy(handler) {
    return async (policyContext, config, { strapi: _strapi }) => {
        const authContext = {
            user: policyContext.state.user ?? null,
            params: policyContext.params ?? {},
            body: policyContext.request?.body ?? {},
            query: policyContext.query ?? {},
            headers: policyContext.headers ?? {},
            method: policyContext.method ?? "",
            path: policyContext.path ?? "",
        };
        const result = await handler(authContext, config);
        if (!result.passed) {
            return false;
        }
        return true;
    };
}
