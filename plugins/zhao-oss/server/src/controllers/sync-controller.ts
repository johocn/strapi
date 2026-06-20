import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getDashboard(ctx: any) {
    try {
      const syncService = strapi.plugin("zhao-oss").service("sync-service");
      const registry = strapi.plugin("zhao-oss").service("provider-registry");
      const isHealthy = await registry.isPrimaryHealthy();

      const stats = await syncService.getSyncStats();
      const activeProviders = registry.getActiveProviders();
      const providerTypes = registry.getProviderTypes();

      ctx.body = { isHealthy, stats, activeProviders, availableProviderTypes: providerTypes };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async getSyncRecords(ctx: any) {
    try {
      const { page = 1, pageSize = 20, status } = ctx.query;
      const mediaService = strapi.plugin("zhao-oss").service("media-service");
      ctx.body = await mediaService.listSyncRecords({ page: parseInt(page), pageSize: parseInt(pageSize), status });
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async triggerSync(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { fileId } = body;
      if (!fileId) { ctx.status = 400; ctx.body = { error: "fileId is required" }; return; }

      const syncService = strapi.plugin("zhao-oss").service("sync-service");
      await syncService.backupFile(fileId);
      ctx.body = await syncService.checkSyncStatus(fileId);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async batchSync(ctx: any) {
    try {
      const syncService = strapi.plugin("zhao-oss").service("sync-service");
      ctx.body = await syncService.batchSync(100, 0);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async deleteRemote(ctx: any) {
    try {
      const { recordId } = ctx.params;
      const syncService = strapi.plugin("zhao-oss").service("sync-service");
      await syncService.deleteRemote(parseInt(recordId));
      ctx.body = { success: true };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async checkHealth(ctx: any) {
    try {
      const registry = strapi.plugin("zhao-oss").service("provider-registry");
      const isHealthy = await registry.isPrimaryHealthy();
      ctx.body = {
        healthy: isHealthy,
        primaryProvider: registry.getActiveProviders()[0] || null,
        activeProviders: registry.getActiveProviders(),
      };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },
});
