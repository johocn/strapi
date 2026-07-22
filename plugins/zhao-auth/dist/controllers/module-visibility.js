"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = require("../permissions");
const module_visibility_1 = require("../constants/module-visibility");
const VALID_ROLES = new Set(Object.values(permissions_1.ROLES));
exports.default = {
    async get(ctx) {
        const siteId = ctx.state?.siteDocumentId;
        if (!siteId) {
            ctx.status = 400;
            ctx.body = { error: "缺少租户上下文" };
            return;
        }
        const siteConfigService = strapi.plugin("zhao-common").service("site-config");
        const config = await siteConfigService.getConfig(siteId);
        ctx.body = { data: config?.moduleVisibility ?? {} };
    },
    async update(ctx) {
        const siteId = ctx.state?.siteDocumentId;
        if (!siteId) {
            ctx.status = 400;
            ctx.body = { error: "缺少租户上下文" };
            return;
        }
        const body = ctx.request.body?.data || ctx.request.body;
        const { moduleVisibility } = body;
        if (typeof moduleVisibility !== "object" || Array.isArray(moduleVisibility)) {
            ctx.status = 400;
            ctx.body = { error: "moduleVisibility must be an object" };
            return;
        }
        const filtered = {};
        for (const [key, roles] of Object.entries(moduleVisibility)) {
            if (!module_visibility_1.VISIBILITY_MODULES.includes(key)) {
                strapi.log.warn(`[module-visibility] Unknown moduleKey ignored: ${key}`);
                continue;
            }
            if (!Array.isArray(roles)) {
                ctx.status = 400;
                ctx.body = { error: `moduleVisibility.${key} must be an array` };
                return;
            }
            filtered[key] = roles.filter((r) => typeof r === "string" && VALID_ROLES.has(r));
        }
        // 新增：校验 tenant roles ⊆ global roles（交集收窄写入校验）
        let globalVisibility = {};
        try {
            const globalConfig = await strapi.plugin("zhao-common").service("global-config").getGlobalConfig();
            globalVisibility = globalConfig?.moduleVisibility ?? {};
        }
        catch {
            // 读取失败时允许写入（fallback 到 DEFAULT_MODULE_VISIBILITY）
        }
        for (const [key, roles] of Object.entries(filtered)) {
            const globalRoles = globalVisibility[key] ?? module_visibility_1.DEFAULT_MODULE_VISIBILITY[key] ?? [];
            const invalidRoles = roles.filter((r) => !globalRoles.includes(r));
            if (invalidRoles.length > 0) {
                ctx.status = 400;
                ctx.body = {
                    error: `moduleVisibility.${key} 包含全局未授权的角色: ${invalidRoles.join(", ")}`,
                };
                return;
            }
        }
        try {
            const siteConfigService = strapi.plugin("zhao-common").service("site-config");
            await siteConfigService.updateConfig(siteId, { moduleVisibility: filtered });
            // 失效该租户所有用户的权限缓存
            try {
                strapi.plugin("zhao-auth")?.service("permission")?.invalidateCache?.(undefined, siteId);
            }
            catch {
                // 忽略
            }
            ctx.body = { data: filtered };
        }
        catch (e) {
            ctx.status = 500;
            ctx.body = { error: e.message };
        }
    },
};
