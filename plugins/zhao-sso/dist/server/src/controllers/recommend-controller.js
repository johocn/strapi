"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    /** C 端"猜你喜欢"：基于 sso-user 画像兴趣标签推荐 课程/文章/活动 */
    async my(ctx) {
        var _a, _b;
        try {
            const ssoUser = (_a = ctx.state) === null || _a === void 0 ? void 0 : _a.ssoUser;
            if (!(ssoUser === null || ssoUser === void 0 ? void 0 : ssoUser.sub)) {
                ctx.status = 401;
                return { error: "未登录" };
            }
            const user = await strapi.plugin("zhao-sso").service("sso-user").findByUuid(ssoUser.sub);
            if (!(user === null || user === void 0 ? void 0 : user.id)) {
                ctx.status = 401;
                return { error: "未登录" };
            }
            const limit = Math.min(Number((_b = ctx.query) === null || _b === void 0 ? void 0 : _b.limit) || 5, 10);
            const svc = strapi.plugin("zhao-sso").service("sso-recommend");
            ctx.body = { data: await svc.recommendFor(user.id, limit) };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message, code: e.code || null };
        }
    },
});
//# sourceMappingURL=recommend-controller.js.map