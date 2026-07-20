import { VISIBILITY_MODULES } from "../../../../zhao-auth/server/src/constants/module-visibility";

export default {
  async get(ctx: any) {
    const service = strapi.plugin("zhao-common").service("global-config");
    const data = await service.getGlobalConfig();
    ctx.body = { data };
  },

  async update(ctx: any) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { moduleEnabled, moduleTenantGrants } = body;

    if (moduleEnabled !== undefined) {
      if (typeof moduleEnabled !== "object" || Array.isArray(moduleEnabled)) {
        ctx.status = 400;
        ctx.body = { error: "moduleEnabled must be an object" };
        return;
      }
      for (const key of Object.keys(moduleEnabled)) {
        if (!VISIBILITY_MODULES.includes(key)) {
          strapi.log.warn(`[global-config] Unknown moduleKey ignored: ${key}`);
          delete moduleEnabled[key];
        }
      }
    }

    if (moduleTenantGrants !== undefined) {
      if (typeof moduleTenantGrants !== "object" || Array.isArray(moduleTenantGrants)) {
        ctx.status = 400;
        ctx.body = { error: "moduleTenantGrants must be an object" };
        return;
      }
      for (const [key, tenantIds] of Object.entries(moduleTenantGrants)) {
        if (!VISIBILITY_MODULES.includes(key)) continue;
        if (!Array.isArray(tenantIds)) {
          ctx.status = 400;
          ctx.body = { error: `moduleTenantGrants.${key} must be an array` };
          return;
        }
      }
    }

    try {
      const service = strapi.plugin("zhao-common").service("global-config");
      const saved = await service.updateGlobalConfig({ moduleEnabled, moduleTenantGrants });
      ctx.body = { data: saved };
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },
};
