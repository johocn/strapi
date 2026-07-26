"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async me(ctx) {
        try {
            const ssoUser = ctx.state.ssoUser;
            if (!ssoUser) {
                ctx.status = 401;
                ctx.body = { error: "未认证" };
                return;
            }
            const userService = strapi.plugin("zhao-sso").service("sso-user");
            const user = await userService.findByUuid(ssoUser.sub);
            if (!user) {
                ctx.status = 404;
                ctx.body = { error: "用户不存在" };
                return;
            }
            ctx.body = user;
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async bind(ctx) {
        var _a;
        try {
            const ssoUser = ctx.state.ssoUser;
            if (!ssoUser) {
                ctx.status = 401;
                ctx.body = { error: "未认证" };
                return;
            }
            const body = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body;
            const { type, identifier, password, provider_data } = body;
            const userService = strapi.plugin("zhao-sso").service("sso-user");
            const user = await userService.findByUuid(ssoUser.sub);
            if (!user) {
                ctx.status = 404;
                ctx.body = { error: "用户不存在" };
                return;
            }
            if (type === "mobile" || type === "email" || type === "username") {
                await userService.bindContact(user.id, type, identifier, password);
                ctx.body = { success: true, message: `已绑定 ${type}` };
                return;
            }
            if (type === "third_party" && provider_data) {
                await userService.bindThirdParty(user.id, provider_data);
                ctx.body = { success: true, message: "已绑定第三方账号" };
                return;
            }
            ctx.status = 400;
            ctx.body = { error: "不支持的绑定类型" };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async unbind(ctx) {
        var _a;
        try {
            const ssoUser = ctx.state.ssoUser;
            if (!ssoUser) {
                ctx.status = 401;
                ctx.body = { error: "未认证" };
                return;
            }
            const body = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body;
            const { provider } = body;
            if (!provider) {
                ctx.status = 400;
                ctx.body = { error: "provider 必填" };
                return;
            }
            const user = await strapi.plugin("zhao-sso").service("sso-user").findByUuid(ssoUser.sub);
            if (!user) {
                ctx.status = 404;
                ctx.body = { error: "用户不存在" };
                return;
            }
            await strapi.plugin("zhao-sso").service("sso-user").unbindThirdParty(user.id, provider);
            ctx.body = { success: true };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async changePassword(ctx) {
        var _a;
        try {
            const ssoUser = ctx.state.ssoUser;
            if (!ssoUser) {
                ctx.status = 401;
                ctx.body = { error: "未认证" };
                return;
            }
            const body = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body;
            const { old_password, new_password } = body;
            if (!old_password || !new_password) {
                ctx.status = 400;
                ctx.body = { error: "old_password 和 new_password 必填" };
                return;
            }
            const userService = strapi.plugin("zhao-sso").service("sso-user");
            const user = await userService.findByUuid(ssoUser.sub);
            if (!user) {
                ctx.status = 404;
                ctx.body = { error: "用户不存在" };
                return;
            }
            const valid = await userService.verifyPassword(user, old_password);
            if (!valid) {
                ctx.status = 400;
                ctx.body = { error: "旧密码错误" };
                return;
            }
            await userService.changePassword(user.id, new_password);
            ctx.body = { success: true };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
});
