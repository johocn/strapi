// server/src/controllers/permission-matrix.ts
// Strapi v5 标准模式：export default ({ strapi }) => ({ async method(ctx) {} })
import { Core } from "@strapi/strapi";
import { DEFAULT_ROLE_PERMISSIONS, flattenPermissions, PERMISSION_TREE, ROLES } from "../permissions";

const PERMISSION_UID = "plugin::zhao-auth.permission";

// 将多种命名风格（ADMIN / CHANNEL_ADMIN / channel_admin / channel admin）
// 统一归一化为 ROLES 常量使用的小写连字符格式（如 admin / channel-admin）
function normalizeRoleName(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getMatrix(ctx: any) {
    try {
      const roles = await strapi.db.query(PERMISSION_UID).findMany({ limit: 100 });
      const allActions = flattenPermissions(PERMISSION_TREE);

      ctx.send({
        data: roles.map((r: any) => ({
          role: r.role,
          displayName: r.displayName,
          permissions: r.permissions || [],
          isSystem: r.isSystem,
          seedVersion: r.seedVersion,
        })),
        actions: allActions,
      });
    } catch (error: any) {
      strapi.log.error(`[zhao-auth] getMatrix failed: ${error.message}`);
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async updateRolePermissions(ctx: any) {
    try {
      const { role } = ctx.params;
      const normalizedRole = normalizeRoleName(role);
      const { permissions } = ctx.request.body;

      if (!Array.isArray(permissions)) {
        return ctx.throw(400, "permissions must be an array");
      }

      if (normalizedRole === ROLES.ADMIN) {
        return ctx.throw(403, "Cannot modify ADMIN role permissions");
      }

      const existing = await strapi.db.query(PERMISSION_UID).findOne({ where: { role: normalizedRole } });
      if (!existing) {
        return ctx.throw(404, "Role not found");
      }

      await strapi.db.query(PERMISSION_UID).update({
        where: { id: existing.id },
        data: { permissions },
      });

      // Invalidate cache
      strapi.plugin("zhao-auth").service("permission").invalidatePermissionCache();

      ctx.send({ success: true });
    } catch (error: any) {
      strapi.log.error(`[zhao-auth] updateRolePermissions failed: ${error.message}`);
      ctx.status = error.status || 500;
      ctx.body = { error: error.message };
    }
  },

  async resetRolePermissions(ctx: any) {
    try {
      const { role } = ctx.params;
      const normalizedRole = normalizeRoleName(role);

      if (normalizedRole === ROLES.ADMIN) {
        return ctx.throw(403, "Cannot reset ADMIN role");
      }

      const defaultPerms = (DEFAULT_ROLE_PERMISSIONS as any)[normalizedRole];
      if (!defaultPerms) {
        return ctx.throw(404, "No default permissions for this role");
      }

      const existing = await strapi.db.query(PERMISSION_UID).findOne({ where: { role: normalizedRole } });
      if (!existing) {
        return ctx.throw(404, "Role not found");
      }

      await strapi.db.query(PERMISSION_UID).update({
        where: { id: existing.id },
        data: { permissions: defaultPerms },
      });

      strapi.plugin("zhao-auth").service("permission").invalidatePermissionCache();

      ctx.send({ success: true, permissions: defaultPerms });
    } catch (error: any) {
      strapi.log.error(`[zhao-auth] resetRolePermissions failed: ${error.message}`);
      ctx.status = error.status || 500;
      ctx.body = { error: error.message };
    }
  },

  async getActions(ctx: any) {
    const allActions = flattenPermissions(PERMISSION_TREE);
    ctx.send({ data: allActions });
  },
});
