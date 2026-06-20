import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /permissions/tree
   */
  async getTree(ctx: any) {
    try {
      const tree = strapi.plugin("zhao-auth").service("permission").getPermissionTree();
      ctx.body = tree;
    } catch (error: any) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  /**
   * GET /roles — 角色列表
   */
  async listRoles(ctx: any) {
    try {
      const { page = 1, pageSize = 20, role } = ctx.query;
      const result = await strapi
        .plugin("zhao-auth")
        .service("permission")
        .listRoles(parseInt(page, 10), parseInt(pageSize, 10), { role });
      ctx.body = result;
    } catch (error: any) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  /**
   * GET /roles/all — 全部角色（下拉用）
   */
  async getAllRoles(ctx: any) {
    try {
      const result = await strapi
        .plugin("zhao-auth")
        .service("permission")
        .getAllRoles();
      ctx.body = { list: result };
    } catch (error: any) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  /**
   * GET /roles/:role — 获取单个角色
   */
  async getRole(ctx: any) {
    try {
      const { role } = ctx.params;
      const result = await strapi
        .plugin("zhao-auth")
        .service("permission")
        .getRole(role);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "角色不存在" };
        return;
      }
      ctx.body = result;
    } catch (error: any) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  /**
   * POST /roles — 创建角色
   */
  async createRole(ctx: any) {
    try {
      const { role, displayName, description, permissions } = ctx.request.body;
      if (!role || !displayName) {
        ctx.status = 400;
        ctx.body = { error: "角色名和显示名称必填" };
        return;
      }
      const result = await strapi
        .plugin("zhao-auth")
        .service("permission")
        .createRole({
          role,
          displayName,
          description,
          permissions: Array.isArray(permissions) ? permissions : [],
        });
      ctx.body = result;
    } catch (error: any) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  /**
   * PUT /roles/:role — 更新角色
   */
  async updateRole(ctx: any) {
    try {
      const { role } = ctx.params;
      const { displayName, description, permissions } = ctx.request.body;
      const result = await strapi
        .plugin("zhao-auth")
        .service("permission")
        .updateRole(role, { displayName, description, permissions });
      ctx.body = result;
    } catch (error: any) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  /**
   * DELETE /roles/:role — 删除角色
   */
  async deleteRole(ctx: any) {
    try {
      const { role } = ctx.params;
      const result = await strapi
        .plugin("zhao-auth")
        .service("permission")
        .deleteRole(role);
      ctx.body = result;
    } catch (error: any) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  /**
   * GET /permissions/role/:role
   */
  async getRolePermissions(ctx: any) {
    try {
      const { role } = ctx.params;
      if (!role) {
        ctx.status = 400;
        ctx.body = { error: "缺少角色参数" };
        return;
      }
      const result = await strapi
        .plugin("zhao-auth")
        .service("permission")
        .getRolePermissions(role);
      ctx.body = result;
    } catch (error: any) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  /**
   * PUT /permissions/role/:role
   */
  async updateRolePermissions(ctx: any) {
    try {
      const { role } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const { permissions } = body;

      if (!role) {
        ctx.status = 400;
        ctx.body = { error: "缺少角色参数" };
        return;
      }
      if (!Array.isArray(permissions)) {
        ctx.status = 400;
        ctx.body = { error: "permissions 必须是数组" };
        return;
      }

      const result = await strapi
        .plugin("zhao-auth")
        .service("permission")
        .updateRolePermissions(role, permissions);
      ctx.body = result;
    } catch (error: any) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  /**
   * POST /permissions/init — 初始化默认角色
   */
  async initRoles(ctx: any) {
    try {
      const results = await strapi
        .plugin("zhao-auth")
        .service("permission")
        .initDefaultRoles();
      ctx.body = { results };
    } catch (error: any) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  /**
   * GET /my/permissions — 获取当前用户权限
   */
  async getMyPermissions(ctx: any) {
    try {
      const userId = ctx.state?.user?.id;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const result = await strapi
        .plugin("zhao-auth")
        .service("permission")
        .getMyPermissions(userId);
      ctx.body = result;
    } catch (error: any) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  /**
   * GET /my/channel-scope
   */
  async getMyChannelScope(ctx: any) {
    try {
      const user = ctx.state?.user;
      if (!user?.id) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }

      const channelScopeService = strapi.plugin("zhao-auth").service("channel-scope");
      const scope = await channelScopeService.resolve(user);
      ctx.body = scope;
    } catch (error: any) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
});
