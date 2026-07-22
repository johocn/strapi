"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async getDashboard(ctx) {
        try {
            const syncService = strapi.plugin("zhao-oss").service("sync-service");
            const registry = strapi.plugin("zhao-oss").service("provider-registry");
            const isHealthy = await registry.isPrimaryHealthy();
            const stats = await syncService.getSyncStats();
            const activeProviders = registry.getActiveProviders();
            const providerTypes = registry.getProviderTypes();
            ctx.body = { isHealthy, stats, activeProviders, availableProviderTypes: providerTypes };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async getSyncRecords(ctx) {
        try {
            const { page = 1, pageSize = 20, status } = ctx.query;
            const mediaService = strapi.plugin("zhao-oss").service("media-service");
            ctx.body = await mediaService.listSyncRecords({ page: parseInt(page), pageSize: parseInt(pageSize), status });
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async triggerSync(ctx) {
        var _a;
        try {
            const body = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body;
            const { fileId } = body;
            if (!fileId) {
                ctx.status = 400;
                ctx.body = { error: "fileId is required" };
                return;
            }
            const syncService = strapi.plugin("zhao-oss").service("sync-service");
            await syncService.backupFile(fileId);
            ctx.body = await syncService.checkSyncStatus(fileId);
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async batchSync(ctx) {
        try {
            const syncService = strapi.plugin("zhao-oss").service("sync-service");
            ctx.body = await syncService.batchSync(100, 0);
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async deleteRemote(ctx) {
        try {
            const { recordId } = ctx.params;
            const syncService = strapi.plugin("zhao-oss").service("sync-service");
            await syncService.deleteRemote(parseInt(recordId));
            ctx.body = { success: true };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async checkHealth(ctx) {
        try {
            const registry = strapi.plugin("zhao-oss").service("provider-registry");
            const isHealthy = await registry.isPrimaryHealthy();
            ctx.body = {
                healthy: isHealthy,
                primaryProvider: registry.getActiveProviders()[0] || null,
                activeProviders: registry.getActiveProviders(),
            };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
});
