"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache = new Map();
exports.default = ({ strapi }) => ({
    async get(key, ttl, generator) {
        const cached = cache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data;
        }
        const data = await generator();
        cache.set(key, { data, expiresAt: Date.now() + ttl * 1000 });
        return data;
    },
    invalidate(key) {
        if (key) {
            cache.delete(key);
        }
        else {
            cache.clear();
        }
    },
});
//# sourceMappingURL=cache.js.map