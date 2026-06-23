import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: any) {
    try {
      const accountService = strapi.plugin("zhao-third").service("third-party-account");
      const filters: Record<string, any> = {};

      const { platform, appType } = ctx.query;
      if (platform) filters.platform = platform;
      if (appType) filters.appType = appType;

      const result = await accountService.findAccounts(filters);
      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 获取账号列表失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
});
