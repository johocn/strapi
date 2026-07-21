import type { Core } from "@strapi/strapi";
import type { UserPermissions } from "../utils/types";
import { DEFAULT_ROLE_PERMISSIONS } from "../permissions";

const USER_UID = "plugin::users-permissions.user";

function throwErr(code: string, status: number, message: string): never {
  const e: any = new Error(message);
  e.code = code;
  e.status = status;
  throw e;
}

/**
 * 角色层级定义 - 数值越高权限越大
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 100,
  'channel-admin': 80,
  'plugin-manager': 60,
  instructor: 40,
  user: 20,
};

/**
 * 角色继承关系 - 定义各角色继承的父角色
 */
export const ROLE_INHERITANCE: Record<string, string[]> = {
  admin: ['channel-admin', 'plugin-manager', 'instructor', 'user'],
  'channel-admin': ['plugin-manager', 'instructor', 'user'],
  'plugin-manager': ['instructor', 'user'],
  instructor: ['user'],
  user: [],
};

const CACHE_TTL = 300000;

const permissionCache = new Map<number, { data: UserPermissions; timestamp: number }>();

function invalidateUserCache(userId: number): void {
  permissionCache.delete(userId);
}

function extractRoleNames(user: any): string[] {
  // 优先级：zhaoRoles(JSON 字符串数组) > roles > role
  if (Array.isArray(user.zhaoRoles) && user.zhaoRoles.length > 0) {
    return user.zhaoRoles
      .map((r: any) => (typeof r === "string" ? r : String(r)))
      .filter((name: string) => name && name.trim());
  }
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles
      .map((r: any) => typeof r === "string" ? r : (r?.name || r?.type))
      .filter((name: string) => name && name.trim());
  }
  if (user.role) {
    if (Array.isArray(user.role)) {
      return user.role
        .map((r: any) => r?.name || r?.type)
        .filter((name: string) => name && name.trim());
    }
    const name = user.role.name || user.role.type;
    return name ? [name] : [];
  }
  return [];
}

const PERMISSION_UID = "plugin::zhao-auth.permission";

/**
 * 获取角色层级（支持自定义角色，查 zhao_permissions 表）
 */
async function getRoleLevel(role: string): Promise<number> {
  if (ROLE_HIERARCHY[role] != null) return ROLE_HIERARCHY[role];
  const roleRecord = await strapi.db.query(PERMISSION_UID).findOne({
    where: { role },
    select: ["level"],
  });
  return (roleRecord as any)?.level ?? 20;
}

/**
 * 获取用户层级（取用户所有角色中的最高层级）
 */
async function getUserLevel(userId: number): Promise<number> {
  const user = await strapi.db.query(USER_UID).findOne({
    where: { id: userId },
    select: ["zhaoRoles"],
    populate: ["role"],
  });
  if (!user) return 20;
  const roles = extractRoleNames(user);
  if (roles.length === 0) return 20;
  const levels = await Promise.all(roles.map(getRoleLevel));
  return Math.max(...levels);
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  async function getUserEffectivePermissions(userId: number): Promise<UserPermissions> {
    const cached = permissionCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
      select: ["id", "zhaoRoles"],
      populate: ['role'],
    });

    if (!user) {
      return { direct: [], inherited: [], effective: [] };
    }

    // 从 zhaoRoles 读取角色名数组，回退到 role.type
    let directRoles: string[] = [];
    if (Array.isArray(user.zhaoRoles) && user.zhaoRoles.length > 0) {
      directRoles = user.zhaoRoles
        .map((r: any) => (typeof r === "string" ? r : String(r)))
        .filter((name: string) => name && name.trim());
    } else if (user.role?.type) {
      directRoles = [user.role.type];
    } else if (user.role?.name) {
      directRoles = [user.role.name];
    }

    const inheritedRoles: string[] = [];
    for (const role of directRoles) {
      const parents = ROLE_INHERITANCE[role];
      if (parents) {
        for (const parent of parents) {
          if (!inheritedRoles.includes(parent)) {
            inheritedRoles.push(parent);
          }
        }
      }
    }

    const effective = [...directRoles, ...inheritedRoles];

    const permissions: UserPermissions = {
      direct: directRoles,
      inherited: inheritedRoles,
      effective,
    };

    permissionCache.set(userId, { data: permissions, timestamp: Date.now() });

    return permissions;
  }

  return ({
  /**
   * 查询用户列表
   * @param filters 筛选条件
   * @param page 页码
   * @param pageSize 每页数量
   */
  async findUsers(filters: Record<string, any> = {}, page = 1, pageSize = 20) {
    const where: Record<string, any> = {};

    if (filters['filters[username][$contains]']) {
      where.username = { $contains: filters['filters[username][$contains]'] };
    } else if (filters.username) {
      where.username = { $contains: filters.username };
    }

    if (filters['filters[email][$contains]']) {
      where.email = { $contains: filters['filters[email][$contains]'] };
    } else if (filters.email) {
      where.email = { $contains: filters.email };
    }

    const users = await strapi.db.query(USER_UID).findMany({
      where,
      select: ["id", "email", "username", "createdAt", "zhaoRoles"],
      populate: ['role'],
      orderBy: { id: "asc" },
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    const total = await strapi.db.query(USER_UID).count({ where });

    const list = users.map((user: any) => ({
      id: user.id,
      documentId: user.id,
      username: user.username,
      email: user.email,
      roles: extractRoleNames(user),
      createdAt: user.createdAt,
    }));

    return {
      data: list,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  },

  /**
   * 分配角色给用户
   *
   * 业务约束（admin 必须遵守，代码不强制校验）：
   * - channel-admin 角色仅可分配给 ADMIN_CHANNEL_TIERS 渠道（core/senior/global/authorized/official/partner/agent）的所有者
   * - 不应给 national 以下 tier 渠道所有者分配 channel-admin 角色（national 是分销节点，由父渠道代管）
   * - 如需让 national owner 登录后台管理自己渠道，应先升级其渠道 tier（如 national → core），再分配 channel-admin
   * - 误分配 channel-admin 给 national owner 会导致：national owner 能创建自己的租户，绕过分销体系
   *
   * 后续迭代（方案 B）：增加硬编码业务校验，当 role='channel-admin' 时查询被分配用户的
   * channel-member（isCurrent=true）的 channel.channelTier，仅允许 ADMIN_CHANNEL_TIERS 包含的 tier
   *
   * @param userId 用户ID
   * @param role 角色名称
   * @param operatorId 操作人ID
   * @param reason 操作原因
   */
  async assignRole(
    userId: number,
    role: string,
    operatorId: number,
    reason?: string
  ) {
    if (!role || typeof role !== "string" || !role.trim()) {
      throwErr("INVALID_ROLE", 400, `角色名不能为空`);
    }
    const normalizedRole = role.trim();

    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
      select: ["id", "zhaoRoles"],
      populate: ['role'],
    });

    if (!user) {
      throwErr("USER_NOT_FOUND", 404, "用户不存在");
    }

    const currentRoles = extractRoleNames(user);

    if (currentRoles.includes(normalizedRole)) {
      throwErr("ROLE_ALREADY_ASSIGNED", 409, `用户已拥有角色: ${normalizedRole}`);
    }

    // 层级校验（非 admin）
    const operatorLevel = await getUserLevel(operatorId);
    if (operatorLevel < 100) {
      const targetLevel = await getRoleLevel(normalizedRole);
      if (targetLevel > operatorLevel) {
        throwErr("ROLE_004", 403, "不能分配同级或更高层级角色");
      }
    }

    // 渠道成员校验（非 admin）
    if (operatorLevel < 100) {
      // 1. 查询操作者归属渠道（isCurrent=true 的渠道）
      const operatorChannels = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
        where: { user: operatorId, isCurrent: true },
        populate: { channel: { select: ["id"] } },
      });
      const operatorChannelIds = operatorChannels.map((cm: any) => cm.channel?.id).filter(Boolean);
      if (operatorChannelIds.length === 0) {
        throwErr("ROLE_005", 403, "操作者未归属任何渠道");
      }

      // 2. 校验被分配用户是操作者渠道成员
      const targetUserChannels = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
        where: { user: userId, channel: { id: { $in: operatorChannelIds } } },
      });
      if (targetUserChannels.length === 0) {
        throwErr("ROLE_005", 403, "只能分配自己渠道内成员");
      }
    }

    const newRoles = [...currentRoles, normalizedRole];

    await strapi.db.query(USER_UID).update({
      where: { id: userId },
      data: { zhaoRoles: newRoles },
    });

    // 非 admin 自动创建 role-channel 记录
    if (operatorLevel < 100) {
      const operatorChannels = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
        where: { user: operatorId, isCurrent: true },
        populate: { channel: { select: ["id"] } },
      });
      const currentChannelId = operatorChannels[0]?.channel?.id;
      if (currentChannelId != null) {
        // 检查是否已存在记录（幂等）
        const existing = await strapi.db.query("plugin::zhao-auth.role-channel").findOne({
          where: { role: normalizedRole, channel: currentChannelId },
        });
        if (!existing) {
          await strapi.db.query("plugin::zhao-auth.role-channel").create({
            data: { role: normalizedRole, channel: currentChannelId, assignedBy: operatorId },
          });
        }
      }
    }

    invalidateUserCache(userId);
    // 失效权限缓存（channel-admin 动态权限可能受角色变更影响）
    try {
      strapi.plugin("zhao-auth")?.service("permission")?.invalidateCache?.(userId);
    } catch {
      // 忽略
    }
    await this.logAction(operatorId, userId, "assign", role, reason);

    return {
      success: true,
      message: `角色 ${role} 分配成功`,
      user: {
        id: userId,
        roles: newRoles,
      },
    };
  },

  async revokeRole(
    userId: number,
    role: string,
    operatorId: number,
    reason?: string
  ) {
    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
      select: ["id", "zhaoRoles"],
      populate: ['role'],
    });

    if (!user) {
      throwErr("USER_NOT_FOUND", 404, "用户不存在");
    }

    const currentRoles = extractRoleNames(user);

    if (!currentRoles.includes(role)) {
      throwErr("ROLE_NOT_ASSIGNED", 400, `用户未拥有角色: ${role}`);
    }

    if (currentRoles.length === 1) {
      throwErr("MIN_ROLE_REQUIRED", 400, "用户至少需要拥有一个角色");
    }

    const newRoles = currentRoles.filter((r: string) => r !== role);

    await strapi.db.query(USER_UID).update({
      where: { id: userId },
      data: { zhaoRoles: newRoles },
    });

    invalidateUserCache(userId);
    // 失效权限缓存
    try {
      strapi.plugin("zhao-auth")?.service("permission")?.invalidateCache?.(userId);
    } catch {
      // 忽略
    }
    await this.logAction(operatorId, userId, "revoke", role, reason);

    return {
      success: true,
      message: `角色 ${role} 撤销成功`,
      user: {
        id: userId,
        roles: newRoles,
      },
    };
  },

  /**
   * 获取用户角色列表
   * @param userId 用户ID
   */
  async getUserRoles(userId: number) {
    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
      select: ["id", "email", "username", "zhaoRoles"],
      populate: ['role'],
    });

    if (!user) {
      throwErr("USER_NOT_FOUND", 404, "用户不存在");
    }

    const roleNames = extractRoleNames(user);

    const roles = roleNames.map((name: string) => {
      const roleObj = user.role;
      return {
        id: roleObj?.id,
        name,
        description: roleObj?.description,
      };
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      roles,
    };
  },

  /**
   * 批量分配角色
   * @param userIds 用户ID列表
   * @param role 角色名称
   * @param operatorId 操作人ID
   * @param reason 操作原因
   */
  async batchAssignRoles(
    userIds: number[],
    role: string,
    operatorId: number,
    reason?: string
  ) {
    const results: { userId: number; success: boolean; message: string }[] = [];

    for (const userId of userIds) {
      try {
        await this.assignRole(userId, role, operatorId, reason);
        results.push({ userId, success: true, message: "分配成功" });
      } catch (error: any) {
        results.push({ userId, success: false, message: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: failCount === 0,
      message: `批量分配完成: ${successCount} 成功, ${failCount} 失败`,
      results,
    };
  },

  /**
   * 记录操作日志
   * @param operatorId 操作人ID
   * @param targetUserId 目标用户ID
   * @param action 操作类型
   * @param role 角色名称
   * @param reason 操作原因
   */
  async logAction(
    operatorId: number,
    targetUserId: number,
    action: "assign" | "revoke",
    role: string,
    reason?: string
  ) {
    try {
      const logEntry = {
        operatorId,
        targetUserId,
        action,
        role,
        reason,
        timestamp: new Date().toISOString(),
      };
      
      strapi.log.info(`[zhao-auth] Role action: ${action} ${role} for user ${targetUserId} by operator ${operatorId}`);
      
      await strapi.db.query("plugin::zhao-auth.role-action-log").create({
        data: logEntry,
      });
    } catch (error) {
      strapi.log.error(`[zhao-auth] Failed to log role action: ${error}`);
    }
  },

  /**
   * 获取角色操作日志
   * @param userId 可选，按目标用户筛选
   * @param operatorId 可选，按操作人筛选
   * @param page 页码
   * @param pageSize 每页数量
   */
  async getActionLogs(
    userId?: number,
    operatorId?: number,
    page = 1,
    pageSize = 20
  ) {
    const filters: Record<string, any> = {};
    
    if (userId) {
      filters.targetUserId = userId;
    }
    if (operatorId) {
      filters.operatorId = operatorId;
    }

    const logs = await strapi.db.query("plugin::zhao-auth.role-action-log").findMany({
      where: filters,
      orderBy: { timestamp: "desc" },
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    const total = await strapi.db.query("plugin::zhao-auth.role-action-log").count({
      where: filters,
    });

    return {
      data: logs,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  },

  /**
   * 检查用户是否具有特定权限（包含继承权限）
   * @param userId 用户ID
   * @param requiredRole 所需角色
   * @returns 是否具有权限
   */
  async checkPermission(userId: number, requiredRole: string): Promise<boolean> {
    const effectiveRoles = await getUserEffectivePermissions(userId);
    return effectiveRoles.effective.includes(requiredRole);
  },

  /**
   * 获取用户有效权限信息
   * @param userId 用户ID
   * @returns 用户权限信息
   */
  async getUserEffectivePermissions(userId: number): Promise<UserPermissions> {
    return await getUserEffectivePermissions(userId);
  },

  /**
   * 清除用户权限缓存
   * @param userId 用户ID
   */
  async invalidateUserCache(userId: number): Promise<void> {
    invalidateUserCache(userId);
  },

  /**
   * 获取用户层级（取所有角色中的最高层级）
   * @param userId 用户ID
   * @returns 层级数值（1-100）
   */
  async getUserLevel(userId: number): Promise<number> {
    return getUserLevel(userId);
  },

  /**
   * 根据角色列表计算权限映射
   * @param roles 用户角色列表
   * @returns 角色和权限映射
   */
  computePermissions(roles: string[]) {
    const permissions: Record<string, boolean> = {};
    // 用 DEFAULT_ROLE_PERMISSIONS 计算权限
    for (const role of roles) {
      const rolePerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
      for (const action of rolePerms) {
        permissions[action] = true;
      }
    }
    return { roles, permissions };
  },
});
};