import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findUsers(ctx: any) {
    try {
      const { page = 1, pageSize = 20, ...filters } = ctx.query;
      const result = await strapi
        .plugin("zhao-auth")
        .service("role-management")
        .findUsers(
          filters,
          parseInt(page, 10),
          parseInt(pageSize, 10)
        );
      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-auth] Find users failed: ${error.message}`);
      ctx.status = (error as any).status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },

  async assignRole(ctx: any) {
    try {
      const { userId, role, reason } = ctx.request.body;
      const operatorId = ctx.state.user?.id;

      if (!userId || !role) {
        ctx.status = 400; ctx.body = { error: "缺少必要参数: userId 和 role" }; return;
      }

      if (!operatorId) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }

      const result = await strapi
        .plugin("zhao-auth")
        .service("role-management")
        .assignRole(userId, role, operatorId, reason);

      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-auth] Assign role failed: ${error.message}`);
      ctx.status = (error as any).status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },

  async revokeRole(ctx: any) {
    try {
      const { userId, role, reason } = ctx.request.body;
      const operatorId = ctx.state.user?.id;

      if (!userId || !role) {
        ctx.status = 400; ctx.body = { error: "缺少必要参数: userId 和 role" }; return;
      }

      if (!operatorId) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }

      const result = await strapi
        .plugin("zhao-auth")
        .service("role-management")
        .revokeRole(userId, role, operatorId, reason);

      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-auth] Revoke role failed: ${error.message}`);
      ctx.status = (error as any).status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },

  async getUserRoles(ctx: any) {
    try {
      const userId = parseInt(ctx.params.id, 10);

      if (isNaN(userId)) {
        ctx.status = 400; ctx.body = { error: "无效的用户ID" }; return;
      }

      const result = await strapi
        .plugin("zhao-auth")
        .service("role-management")
        .getUserRoles(userId);

      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-auth] Get user roles failed: ${error.message}`);
      ctx.status = (error as any).status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },

  async batchAssignRoles(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { userIds, role, reason } = body;
      const operatorId = ctx.state.user?.id;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        ctx.status = 400; ctx.body = { error: "缺少必要参数: userIds 必须是非空数组" }; return;
      }

      if (!role) {
        ctx.status = 400; ctx.body = { error: "缺少必要参数: role" }; return;
      }

      if (!operatorId) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }

      const result = await strapi
        .plugin("zhao-auth")
        .service("role-management")
        .batchAssignRoles(userIds, role, operatorId, reason);

      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-auth] Batch assign roles failed: ${error.message}`);
      ctx.status = (error as any).status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },

  async getActionLogs(ctx: any) {
    try {
      const { userId, operatorId, page = 1, pageSize = 20 } = ctx.query;

      const result = await strapi
        .plugin("zhao-auth")
        .service("role-management")
        .getActionLogs(
          userId ? parseInt(userId, 10) : undefined,
          operatorId ? parseInt(operatorId, 10) : undefined,
          parseInt(page, 10),
          parseInt(pageSize, 10)
        );

      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-auth] Get action logs failed: ${error.message}`);
      ctx.status = (error as any).status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },

  async getMyRoles(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }

      const result = await strapi
        .plugin("zhao-auth")
        .service("role-management")
        .getUserRoles(userId);

      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-auth] Get my roles failed: ${error.message}`);
      ctx.status = (error as any).status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },

  async getMyPermissions(ctx: any) {
    try {
      const user = ctx.state.user;
      if (!user?.id) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }

      const roles = user.roles || [];
      ctx.body = strapi.plugin("zhao-auth").service("role-management").computePermissions(roles);
    } catch (error: any) {
      strapi.log.error(`[zhao-auth] Get my permissions failed: ${error.message}`);
      ctx.status = (error as any).status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
});
