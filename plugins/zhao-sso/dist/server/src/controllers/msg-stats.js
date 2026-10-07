"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async sopStats(ctx) {
        var _a;
        const { from, to, scene } = ctx.query || {};
        try {
            const data = await strapi.plugin("zhao-sso").service("sso-stats").getSopStats({ from, to, scene });
            ctx.body = { data };
        }
        catch (e) {
            ctx.status = e.status || ((_a = e.cause) === null || _a === void 0 ? void 0 : _a.status) || 400;
            ctx.body = { error: e.message };
        }
    },
    async repurchaseStats(ctx) {
        var _a;
        const { from, to } = ctx.query || {};
        try {
            const data = await strapi.plugin("zhao-sso").service("sso-stats").getRepurchaseStats({ from, to });
            ctx.body = { data };
        }
        catch (e) {
            ctx.status = e.status || ((_a = e.cause) === null || _a === void 0 ? void 0 : _a.status) || 400;
            ctx.body = { error: e.message };
        }
    },
    async courseD7Stats(ctx) {
        var _a;
        const { from, to } = ctx.query || {};
        try {
            const data = await strapi.plugin("zhao-sso").service("sso-stats").getCourseD7Stats({ from, to });
            ctx.body = { data };
        }
        catch (e) {
            ctx.status = e.status || ((_a = e.cause) === null || _a === void 0 ? void 0 : _a.status) || 400;
            ctx.body = { error: e.message };
        }
    },
    async courseCompletionStats(ctx) {
        var _a;
        const { from, to } = ctx.query || {};
        try {
            const data = await strapi.plugin("zhao-sso").service("sso-stats").getCourseCompletionStats({ from, to });
            ctx.body = { data };
        }
        catch (e) {
            ctx.status = e.status || ((_a = e.cause) === null || _a === void 0 ? void 0 : _a.status) || 400;
            ctx.body = { error: e.message };
        }
    },
    async repurchaseLeads(ctx) {
        var _a;
        try {
            const { from, to, page, pageSize, status } = ctx.query || {};
            const data = await strapi.plugin("zhao-sso").service("sso-stats").getRepurchaseLeads({ from, to, page, pageSize, status });
            ctx.body = { data };
        }
        catch (e) {
            ctx.status = e.status || ((_a = e.cause) === null || _a === void 0 ? void 0 : _a.status) || 400;
            ctx.body = { error: e.message };
        }
    },
    async updateRepurchaseFollow(ctx) {
        var _a, _b;
        try {
            const { status, remark } = ((_a = ctx.request) === null || _a === void 0 ? void 0 : _a.body) || {};
            const data = await strapi.plugin("zhao-sso").service("sso-stats").updateRepurchaseFollow({ jobId: ctx.params.id, status, remark });
            ctx.body = { data };
        }
        catch (e) {
            ctx.status = e.status || ((_b = e.cause) === null || _b === void 0 ? void 0 : _b.status) || 400;
            ctx.body = { error: e.message };
        }
    },
});
//# sourceMappingURL=msg-stats.js.map