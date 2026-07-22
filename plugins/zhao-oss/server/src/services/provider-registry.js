"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const providers_1 = require("./providers");
exports.default = ({ strapi }) => {
    var _a;
    const logger = ((_a = strapi.plugin("zhao-common")) === null || _a === void 0 ? void 0 : _a.service("logger")) || strapi.log;
    const providers = new Map();
    let primaryProviderName = null;
    const registry = {
        getProvider(name) {
            return providers.get(name);
        },
        getPrimaryProvider() {
            if (primaryProviderName) {
                return providers.get(primaryProviderName);
            }
            return undefined;
        },
        async isPrimaryHealthy() {
            const provider = registry.getPrimaryProvider();
            if (!provider)
                return false;
            try {
                return await provider.checkHealth();
            }
            catch (err) {
                logger.warn(`[zhao-oss] Health check failed for provider "${primaryProviderName}"`, {
                    error: err.message,
                });
                return false;
            }
        },
        async reloadProviders(config) {
            var _a, _b, _c;
            // 清除现有提供者
            providers.clear();
            primaryProviderName = null;
            const enabledProviders = config.providers.filter((p) => p.enabled);
            for (const providerConfig of enabledProviders) {
                try {
                    const provider = (0, providers_1.createProvider)(providerConfig.name);
                    await provider.initialize(providerConfig.options);
                    providers.set(providerConfig.name, provider);
                    if (providerConfig.primary) {
                        primaryProviderName = providerConfig.name;
                    }
                    if (!((_a = process.env.NODE_ENV) === null || _a === void 0 ? void 0 : _a.includes("test")))
                        logger.info(`[zhao-oss] Provider "${providerConfig.name}" initialized successfully`);
                }
                catch (err) {
                    if (!((_b = process.env.NODE_ENV) === null || _b === void 0 ? void 0 : _b.includes("test")))
                        logger.error(`[zhao-oss] Failed to initialize provider "${providerConfig.name}"`, {
                            error: err.message,
                        });
                }
            }
            if (primaryProviderName && !providers.has(primaryProviderName)) {
                // 如果主提供者初始化失败，使用第一个可用提供者
                const firstAvailable = providers.keys().next().value;
                if (firstAvailable) {
                    primaryProviderName = firstAvailable;
                    logger.warn(`[zhao-oss] Primary provider failed, falling back to "${firstAvailable}"`);
                }
            }
            if (!((_c = process.env.NODE_ENV) === null || _c === void 0 ? void 0 : _c.includes("test")))
                logger.info(`[zhao-oss] Provider registry loaded: ${registry.getActiveProviders().join(", ") || "none"}`);
        },
        getActiveProviders() {
            return Array.from(providers.keys());
        },
        getProviderTypes() {
            return (0, providers_1.getRegisteredProviders)();
        },
    };
    return registry;
};
