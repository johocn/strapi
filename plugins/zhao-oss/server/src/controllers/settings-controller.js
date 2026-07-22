"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const providers_1 = require("../services/providers");
exports.default = ({ strapi }) => ({
    async getConfig(ctx) {
        var _a;
        try {
            const store = (_a = strapi.store) === null || _a === void 0 ? void 0 : _a.call(strapi, { type: "plugin", name: "zhao-oss" });
            const saved = store ? await store.get({ key: "config" }) : {};
            const defaults = strapi.config.get("plugin::zhao-oss");
            ctx.body = { ...defaults, ...saved };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async updateConfig(ctx) {
        var _a, _b;
        try {
            const newConfig = (((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body);
            const store = (_b = strapi.store) === null || _b === void 0 ? void 0 : _b.call(strapi, { type: "plugin", name: "zhao-oss" });
            if (store) {
                const existing = (await store.get({ key: "config" })) || {};
                await store.set({ key: "config", value: { ...existing, ...newConfig } });
            }
            if (newConfig.providers) {
                const fullConfig = { ...newConfig };
                const registry = strapi.plugin("zhao-oss").service("provider-registry");
                await registry.reloadProviders(fullConfig);
            }
            ctx.body = { success: true };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async testProvider(ctx) {
        var _a, _b, _c;
        try {
            const body = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body;
            const { provider } = body;
            if (!(provider === null || provider === void 0 ? void 0 : provider.name) || !(provider === null || provider === void 0 ? void 0 : provider.options)) {
                ctx.status = 400;
                ctx.body = { error: "Provider name and options are required" };
                return;
            }
            const instance = (0, providers_1.createProvider)(provider.name);
            await instance.initialize(provider.options);
            const healthy = await instance.checkHealth();
            ctx.body = { healthy, provider: provider.name };
        }
        catch (e) {
            const body = ((_b = ctx.request.body) === null || _b === void 0 ? void 0 : _b.data) || ctx.request.body;
            ctx.body = { healthy: false, provider: (_c = body === null || body === void 0 ? void 0 : body.provider) === null || _c === void 0 ? void 0 : _c.name, error: e.message };
        }
    },
});
