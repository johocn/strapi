"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 租户上下文注入策略（Strapi v5 原生签名）
 * 当 ctx.state.siteDocumentId 未设置时（admin 后台场景），从 JWT 的 currentTenantId 注入
 * 确保 channel-admin 在 admin 后台操作时租户覆盖能生效
 *
 * 必须在 is-authenticated 之后、has-permission 之前执行
 */
const tenantContextInjector = async (policyContext, config, { strapi }) => {
    // 若 siteDocumentId 已设置（租户前台场景，由 site-resolver 设置），不覆盖
    if (!policyContext.state?.siteDocumentId) {
        const user = policyContext.state?.user;
        const currentTenantId = user?.currentTenantId;
        if (currentTenantId) {
            policyContext.state.siteDocumentId = currentTenantId;
        }
    }
    // 非阻断策略，始终放行
    return true;
};
exports.default = tenantContextInjector;
