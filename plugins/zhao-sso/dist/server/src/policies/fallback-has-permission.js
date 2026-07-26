"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 内置回退权限策略
 * - 若 zhao-auth 已安装，使用其 permission 服务检查权限
 * - 否则超管放行，非超管返回 false
 *
 * 注意：Strapi v5 的 policyContext 即 Koa ctx，policyContext.throw 不存在
 * config.action 指定要检查的权限动作（如 "sso.oauth-config.create"）
 */
const fallbackHasPermission = async (policyContext, config, { strapi }) => {
    var _a, _b, _c, _d;
    const user = (_a = policyContext.state) === null || _a === void 0 ? void 0 : _a.user;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        return false;
    }
    const action = config === null || config === void 0 ? void 0 : config.action;
    if (!action) {
        // 没有指定权限动作，放行（由认证策略保证已登录）
        return true;
    }
    // admin 角色直接放行
    const userRoles = Array.isArray(user.zhaoRoles)
        ? user.zhaoRoles
        : Array.isArray(user.roles)
            ? (typeof user.roles[0] === "string"
                ? user.roles
                : user.roles.map((r) => (r === null || r === void 0 ? void 0 : r.code) || (r === null || r === void 0 ? void 0 : r.name) || (r === null || r === void 0 ? void 0 : r.type)).filter(Boolean))
            : [];
    if (userRoles.includes("admin")) {
        return true;
    }
    // 使用 zhao-auth 的 permission 服务检查
    try {
        const zhaoAuth = strapi.plugin("zhao-auth");
        if (zhaoAuth) {
            const permissionService = zhaoAuth.service("permission");
            if (permissionService) {
                const tenantDocumentId = (_b = policyContext.state) === null || _b === void 0 ? void 0 : _b.siteDocumentId;
                const result = await permissionService.getMyPermissions(user.id, tenantDocumentId);
                if ((_c = result === null || result === void 0 ? void 0 : result.permissions) === null || _c === void 0 ? void 0 : _c.includes(action)) {
                    return true;
                }
            }
        }
    }
    catch {
        // ignore
    }
    // 回退：超管放行
    const isSuperAdmin = userRoles.includes("strapi-super-admin") ||
        ((_d = user.roles) === null || _d === void 0 ? void 0 : _d.some((r) => r.code === "strapi-super-admin" || r.code === "admin" || r.name === "admin"));
    if (isSuperAdmin) {
        return true;
    }
    return false;
};
exports.default = fallbackHasPermission;
