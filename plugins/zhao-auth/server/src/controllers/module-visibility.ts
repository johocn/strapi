import { ROLES } from "../permissions";
import { VISIBILITY_MODULES } from "../constants/module-visibility";

const VALID_ROLES = new Set(Object.values(ROLES));

export default {
  async get(ctx: any) {
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

  async update(ctx: any) {
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

    const filtered: Record<string, string[]> = {};
    for (const [key, roles] of Object.entries(moduleVisibility)) {
      if (!VISIBILITY_MODULES.includes(key)) {
        strapi.log.warn(`[module-visibility] Unknown moduleKey ignored: ${key}`);
        continue;
      }
      if (!Array.isArray(roles)) {
        ctx.status = 400;
        ctx.body = { error: `moduleVisibility.${key} must be an array` };
        return;
      }
      filtered[key] = (roles as any[]).filter(
        (r) => typeof r === "string" && VALID_ROLES.has(r)
      );
    }

    try {
      const siteConfigService = strapi.plugin("zhao-common").service("site-config");
      await siteConfigService.updateConfig(siteId, { moduleVisibility: filtered });
      ctx.body = { data: filtered };
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },
};
