"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async dashboard(ctx) {
        try {
            const userService = strapi.plugin("zhao-sso").service("sso-user");
            const loginLogService = strapi.plugin("zhao-sso").service("sso-login-log");
            const appService = strapi.plugin("zhao-sso").service("sso-app");
            const channelService = strapi.plugin("zhao-sso").service("sso-channel");
            const totalUsers = await userService.count();
            const activeUsers = await userService.count({ status: "active" });
            const blockedUsers = await userService.count({ status: "blocked" });
            const todayLogins = await loginLogService.count({
                success: true,
                created_at: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            });
            const totalApps = await appService.count();
            const totalChannels = await channelService.count();
            ctx.body = {
                stats: { totalUsers, activeUsers, blockedUsers, todayLogins, totalApps, totalChannels },
            };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async listUsers(ctx) {
        try {
            const { page = 1, pageSize = 25, search, status } = ctx.query;
            const userService = strapi.plugin("zhao-sso").service("sso-user");
            const where = {};
            if (status)
                where.status = status;
            if (search) {
                where.$or = [
                    { email: { $contains: search } },
                    { username: { $contains: search } },
                    { mobile: { $contains: search } },
                ];
            }
            const users = await userService.findMany({
                where,
                orderBy: { created_at: "desc" },
                limit: parseInt(pageSize),
                offset: (parseInt(page) - 1) * parseInt(pageSize),
            });
            const total = await userService.count(where);
            ctx.body = { users, meta: { pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total } } };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async getUser(ctx) {
        try {
            const { id } = ctx.params;
            const userService = strapi.plugin("zhao-sso").service("sso-user");
            const user = await userService.findOneWithBindings(parseInt(id));
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
    async updateUser(ctx) {
        var _a;
        try {
            const { id } = ctx.params;
            const data = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body;
            const userService = strapi.plugin("zhao-sso").service("sso-user");
            const user = await userService.updateAdmin(parseInt(id), data);
            ctx.body = user;
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async listApps(ctx) {
        try {
            const appService = strapi.plugin("zhao-sso").service("sso-app");
            const apps = await appService.findMany();
            ctx.body = apps;
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async createApp(ctx) {
        var _a;
        try {
            const body = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body;
            const appService = strapi.plugin("zhao-sso").service("sso-app");
            const app = await appService.create({
                app_code: body.app_code,
                app_name: body.app_name,
                app_secret: body.app_secret,
                redirect_uris: body.redirect_uris,
                allowed_grant_types: body.allowed_grant_types,
                is_active: body.is_active,
                description: body.description,
            });
            ctx.body = app;
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async updateApp(ctx) {
        var _a;
        try {
            const { id } = ctx.params;
            const data = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body;
            const appService = strapi.plugin("zhao-sso").service("sso-app");
            const app = await appService.update(parseInt(id), data);
            ctx.body = app;
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async getApp(ctx) {
        try {
            const { id } = ctx.params;
            const appService = strapi.plugin("zhao-sso").service("sso-app");
            const app = await appService.findOne(parseInt(id));
            if (!app) {
                ctx.status = 404;
                ctx.body = { error: "应用不存在" };
                return;
            }
            ctx.body = { data: app };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async deleteApp(ctx) {
        try {
            const { id } = ctx.params;
            const appService = strapi.plugin("zhao-sso").service("sso-app");
            const app = await appService.findOne(parseInt(id));
            if (!app) {
                ctx.status = 404;
                ctx.body = { error: "应用不存在" };
                return;
            }
            await appService.delete(parseInt(id));
            ctx.body = { data: { id: parseInt(id) } };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async listChannels(ctx) {
        try {
            const channelService = strapi.plugin("zhao-sso").service("sso-channel");
            const channels = await channelService.listAllAdmin();
            ctx.body = channels;
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async createChannel(ctx) {
        var _a;
        try {
            const body = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body;
            const channelService = strapi.plugin("zhao-sso").service("sso-channel");
            const channel = await channelService.create({
                channel_code: body.channel_code,
                channel_name: body.channel_name,
                channel_type: body.channel_type,
                utm_template: body.utm_template,
                is_active: body.is_active,
                description: body.description,
            });
            ctx.body = channel;
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async updateChannel(ctx) {
        var _a;
        try {
            const { id } = ctx.params;
            const data = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body;
            const channelService = strapi.plugin("zhao-sso").service("sso-channel");
            const channel = await channelService.update(parseInt(id), data);
            ctx.body = channel;
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async listLoginLogs(ctx) {
        try {
            const { page = 1, pageSize = 25, login_type, success } = ctx.query;
            const loginLogService = strapi.plugin("zhao-sso").service("sso-login-log");
            const where = {};
            if (login_type)
                where.login_type = login_type;
            if (success !== undefined)
                where.success = success === "true";
            const logs = await loginLogService.findManyPaginated({
                where,
                orderBy: { created_at: "desc" },
                limit: parseInt(pageSize),
                offset: (parseInt(page) - 1) * parseInt(pageSize),
                populate: { user: { select: ["id", "uuid", "email", "username", "nickname"] } },
            });
            const total = await loginLogService.count(where);
            ctx.body = { logs, meta: { pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total } } };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async channelReport(ctx) {
        try {
            const channelService = strapi.plugin("zhao-sso").service("sso-channel");
            const report = await channelService.channelReport();
            ctx.body = report;
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
});
