import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async dashboard(ctx: any) {
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
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async listUsers(ctx: any) {
    try {
      const { page = 1, pageSize = 25, search, status } = ctx.query;
      const userService = strapi.plugin("zhao-sso").service("sso-user");

      const where: any = {};
      if (status) where.status = status;
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
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async getUser(ctx: any) {
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
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async updateUser(ctx: any) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const user = await userService.updateAdmin(parseInt(id), data);
      ctx.body = user;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async listApps(ctx: any) {
    try {
      const appService = strapi.plugin("zhao-sso").service("sso-app");
      const apps = await appService.findMany();
      ctx.body = apps;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async createApp(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
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
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async updateApp(ctx: any) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      const appService = strapi.plugin("zhao-sso").service("sso-app");
      const app = await appService.update(parseInt(id), data);
      ctx.body = app;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async listChannels(ctx: any) {
    try {
      const channelService = strapi.plugin("zhao-sso").service("sso-channel");
      const channels = await channelService.listAllAdmin();
      ctx.body = channels;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async createChannel(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
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
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async updateChannel(ctx: any) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      const channelService = strapi.plugin("zhao-sso").service("sso-channel");
      const channel = await channelService.update(parseInt(id), data);
      ctx.body = channel;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async listLoginLogs(ctx: any) {
    try {
      const { page = 1, pageSize = 25, login_type, success } = ctx.query;
      const loginLogService = strapi.plugin("zhao-sso").service("sso-login-log");

      const where: any = {};
      if (login_type) where.login_type = login_type;
      if (success !== undefined) where.success = success === "true";

      const logs = await loginLogService.findManyPaginated({
        where,
        orderBy: { created_at: "desc" },
        limit: parseInt(pageSize),
        offset: (parseInt(page) - 1) * parseInt(pageSize),
        populate: { user: { select: ["id", "uuid", "email", "username", "nickname"] } },
      });
      const total = await loginLogService.count(where);

      ctx.body = { logs, meta: { pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total } } };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async channelReport(ctx: any) {
    try {
      const channelService = strapi.plugin("zhao-sso").service("sso-channel");
      const report = await channelService.channelReport();
      ctx.body = report;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },
});
