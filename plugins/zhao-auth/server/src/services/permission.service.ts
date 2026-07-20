import type { Core } from "@strapi/strapi";
import {
  PERMISSION_TREE,
  flattenPermissions,
  DEFAULT_ROLE_PERMISSIONS,
  ROLES,
  ROLE_LABELS,
} from "../permissions";

const PERMISSION_UID = "plugin::zhao-auth.permission";
const USER_UID = "plugin::users-permissions.user";

function normalizeRoleName(name: string): string {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function findNode(key: string, tree: Record<string, any>): any | null {
  for (const [k, node] of Object.entries(tree)) {
    if (k === key) return node;
    if (node?.children) {
      const found = findNode(key, node.children);
      if (found) return found;
    }
  }
  return null;
}

function expandPermissionKeys(keys: string[]): string[] {
  const result = new Set<string>();
  for (const key of keys) {
    result.add(key);
    const found = findNode(key, PERMISSION_TREE);
    if (found?.children) {
      flattenPermissions(found.children).forEach((k) => result.add(k));
    }
  }
  return Array.from(result);
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 获取权限树定义
   */
  getPermissionTree() {
    return PERMISSION_TREE;
  },

  /**
   * 角色列表（分页）
   */
  async listRoles(page = 1, pageSize = 20, filters: any = {}) {
    const where: any = {};
    if (filters.role) where.role = { $contains: filters.role };

    const records = await strapi.db.query(PERMISSION_UID).findMany({
      where,
      orderBy: { id: "asc" },
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    const total = await strapi.db.query(PERMISSION_UID).count({ where });

    const list = records.map((r: any) => ({
      id: r.id,
      documentId: r.documentId,
      name: r.role,
      role: r.role,
      displayName: r.displayName || r.role,
      description: r.description || "",
      isSystem: !!r.isSystem,
      permissions: r.permissions || [],
      userCount: 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return {
      list,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  },

  /**
   * 获取所有角色（不分页，用于下拉）
   */
  async getAllRoles() {
    const records = await strapi.db.query(PERMISSION_UID).findMany({
      orderBy: { id: "asc" },
    });
    return records.map((r: any) => ({
      name: r.role,
      role: r.role,
      displayName: r.displayName || r.role,
      isSystem: !!r.isSystem,
    }));
  },

  /**
   * 获取单个角色
   */
  async getRole(roleName: string) {
    const record: any = await strapi.db.query(PERMISSION_UID).findOne({
      where: { role: roleName },
    });
    if (!record) return null;
    return {
      id: record.id,
      documentId: record.documentId,
      name: record.role,
      role: record.role,
      displayName: record.displayName || record.role,
      description: record.description || "",
      isSystem: !!record.isSystem,
      permissions: record.permissions || [],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  },

  /**
   * 创建角色
   */
  async createRole(
    data: { role: string; displayName: string; description?: string; permissions?: string[]; isSystem?: boolean; level?: number },
    operatorId: number,
    operatorLevel: number
  ) {
    const role = normalizeRoleName(data.role);
    if (!role) {
      const e: any = new Error("角色名不能为空");
      e.status = 400;
      throw e;
    }

    const targetLevel = data.level ?? 20;
    if (operatorLevel < 100 && targetLevel >= operatorLevel) {
      const e: any = new Error("不能创建同级或更高层级角色");
      e.code = "ROLE_003";
      e.status = 403;
      throw e;
    }

    const existing = await strapi.db.query(PERMISSION_UID).findOne({
      where: { role },
    });
    if (existing) {
      const e: any = new Error(`角色 ${role} 已存在`);
      e.status = 409;
      throw e;
    }

    // ===== 新增：permissions 白名单校验（卡点 H）=====
    // admin 跳过校验（admin 拥有全部权限）；operatorLevel < 100 即非 admin
    if (operatorLevel < 100) {
      const operator = await strapi.db.query(USER_UID).findOne({ where: { id: operatorId } });
      const operatorRoles: string[] = Array.isArray(operator?.zhaoRoles) ? operator.zhaoRoles : [];
      // 双重保险：operatorLevel < 100 且 roles 含 admin 也跳过（理论上不会发生）
      if (!operatorRoles.includes("admin")) {
        // 获取操作者的有效权限集合
        const operatorPermsResult = await this.getMyPermissions(operatorId);
        const operatorPerms = new Set(operatorPermsResult.permissions);

        // 校验待创建角色的 permissions 是否是操作者权限的子集
        const requestedPerms = Array.isArray(data.permissions) ? data.permissions : [];
        const unauthorizedPerms = requestedPerms.filter((p) => !operatorPerms.has(p));

        if (unauthorizedPerms.length > 0) {
          const e: any = new Error(
            `不能创建包含超出自身权限的角色，未授权权限：${unauthorizedPerms.join(", ")}`
          );
          e.code = "PERM_010";
          e.status = 403;
          throw e;
        }
      }
    }
    // ===== 白名单校验结束 =====

    const created: any = await strapi.documents(PERMISSION_UID).create({
      data: {
        role,
        displayName: data.displayName || role,
        description: data.description || "",
        permissions: data.permissions || [],
        isSystem: !!data.isSystem,
        level: targetLevel,
      },
    });

    return {
      id: created.id,
      documentId: created.documentId,
      name: created.role,
      role: created.role,
      displayName: created.displayName,
      description: created.description || "",
      isSystem: !!created.isSystem,
      permissions: created.permissions || [],
      level: created.level ?? targetLevel,
    };
  },

  /**
   * 更新角色
   */
  async updateRole(
    roleName: string,
    data: { displayName?: string; description?: string; permissions?: string[] }
  ) {
    const existing: any = await strapi.db.query(PERMISSION_UID).findOne({
      where: { role: roleName },
    });
    if (!existing) {
      const e: any = new Error(`角色 ${roleName} 不存在`);
      e.status = 404;
      throw e;
    }

    const updateData: any = {};
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.permissions !== undefined) updateData.permissions = data.permissions;

    const updated: any = await strapi.documents(PERMISSION_UID).update({
      documentId: existing.documentId,
      data: updateData,
    });

    return {
      id: updated.id,
      documentId: updated.documentId,
      name: updated.role,
      role: updated.role,
      displayName: updated.displayName,
      description: updated.description || "",
      isSystem: !!updated.isSystem,
      permissions: updated.permissions || [],
    };
  },

  /**
   * 删除角色（系统角色不允许删除）
   */
  async deleteRole(roleName: string) {
    const existing: any = await strapi.db.query(PERMISSION_UID).findOne({
      where: { role: roleName },
    });
    if (!existing) {
      const e: any = new Error(`角色 ${roleName} 不存在`);
      e.status = 404;
      throw e;
    }
    if (existing.isSystem) {
      const e: any = new Error("系统角色不允许删除");
      e.status = 400;
      throw e;
    }

    // 注：角色使用独立的 zhaoRoles JSON 字段存储，此处简化不做关联检查
    // （角色名字符串存储，不做强制 FK 约束，允许灵活操作）
    await strapi.documents(PERMISSION_UID).delete({ documentId: existing.documentId });
    return { success: true, role: roleName };
  },

  /**
   * 获取某角色权限
   */
  async getRolePermissions(role: string) {
    const record = await strapi.db.query(PERMISSION_UID).findOne({
      where: { role },
    });
    if (!record) {
      const defaults = DEFAULT_ROLE_PERMISSIONS[role];
      return { role, permissions: defaults || [] };
    }
    return { role, permissions: (record as any).permissions || [] };
  },

  /**
   * 更新某角色权限
   */
  async updateRolePermissions(role: string, permissionKeys: string[]) {
    const existing: any = await strapi.db.query(PERMISSION_UID).findOne({
      where: { role },
    });

    if (existing) {
      const updated: any = await strapi.documents(PERMISSION_UID).update({
        documentId: existing.documentId,
        data: { permissions: permissionKeys } as any,
      });
      return { role, permissions: updated.permissions };
    }

    const created: any = await strapi.documents(PERMISSION_UID).create({
      data: {
        role,
        displayName: ROLE_LABELS[role] || role,
        description: "",
        permissions: permissionKeys,
        isSystem: Object.values(ROLES).includes(role as any),
      },
    });
    return { role, permissions: created.permissions };
  },

  /**
   * 获取当前用户的所有权限
   */
  async getMyPermissions(userId: number) {
    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
      select: ["id", "zhaoRoles"],
      populate: ["role"],
    });

    if (!user) return { permissions: [] };

    // 优先从 zhaoRoles JSON 数组读取角色名
    let userRoles: string[] = [];
    if (Array.isArray((user as any).zhaoRoles) && (user as any).zhaoRoles.length > 0) {
      userRoles = (user as any).zhaoRoles
        .map((r: any) => (typeof r === "string" ? r : String(r)))
        .filter((r: string) => r && r.trim());
    } else if ((user as any).role) {
      // 回退：从 Strapi 内置 role 表读取 type 字段
      const roleObj = (user as any).role;
      if (Array.isArray(roleObj)) {
        userRoles = roleObj.map((r: any) => r?.type).filter((type: string) => type && type.trim());
      } else if (roleObj.type) {
        userRoles = [roleObj.type];
      } else if (roleObj.name) {
        userRoles = [roleObj.name];
      }
    }

    if (userRoles.length === 0) return { permissions: [] };

    // admin 角色全权限
    if (userRoles.includes("admin")) {
      return { permissions: flattenPermissions(PERMISSION_TREE) };
    }

    // 根据每个角色在 zhao-auth.permission 表中查找权限 key
    const allExpanded = new Set<string>();
    for (const roleName of userRoles) {
      try {
        const record = await strapi.db.query(PERMISSION_UID).findOne({
          where: { role: roleName },
        });

        if (record?.permissions && Array.isArray((record as any).permissions)) {
          expandPermissionKeys((record as any).permissions).forEach((k: string) =>
            allExpanded.add(k)
          );
        } else {
          // 数据库中没有该角色，使用默认权限映射
          const defaults = DEFAULT_ROLE_PERMISSIONS[roleName] || [];
          expandPermissionKeys(defaults).forEach((k: string) => allExpanded.add(k));
        }
      } catch {
        // 单个角色查询失败不影响其他角色
      }
    }

    return { permissions: Array.from(allExpanded) };
  },

  /**
   * 初始化并同步默认角色权限（每次启动时调用）
   * 系统角色的权限会与代码配置保持同步
   */
  async initDefaultRoles() {
    const results: string[] = [];

    for (const [role, defaultPerms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const existing: any = await strapi.db.query(PERMISSION_UID).findOne({
        where: { role },
      });

      if (!existing) {
        // 创建新角色
        await strapi.documents(PERMISSION_UID).create({
          data: {
            role,
            displayName: (ROLE_LABELS as any)[role] || role,
            description: "",
            permissions: defaultPerms,
            isSystem: Object.values(ROLES).includes(role as any),
          },
        });
        results.push(`Created role: ${role}`);
      } else {
        // 系统角色：每次启动同步权限配置
        const isSystemRole = Object.values(ROLES).includes(role as any);
        if (isSystemRole) {
          await strapi.documents(PERMISSION_UID).update({
            documentId: existing.documentId,
            data: {
              displayName: (ROLE_LABELS as any)[role] || role,
              description: existing.description || "",
              permissions: defaultPerms,
              isSystem: true,
            } as any,
          });
          results.push(`Synced permissions for system role: ${role}`);
        } else {
          // 非系统角色：只补全字段，不覆盖权限
          if (!existing.displayName) {
            await strapi.documents(PERMISSION_UID).update({
              documentId: existing.documentId,
              data: {
                displayName: (ROLE_LABELS as any)[role] || role,
                description: "",
                isSystem: false,
              } as any,
            });
            results.push(`Updated role fields for: ${role}`);
          } else {
            results.push(`Role ${role} already exists, skipped (non-system)`);
          }
        }
      }
    }

    return results;
  },
});
