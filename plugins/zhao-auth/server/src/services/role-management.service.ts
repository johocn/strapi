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

/**
 * 计算操作者"拥有的角色全集"（用于子集校验 + getAssignableRoles）
 * = 操作者 zhaoRoles（显式分配 + 核心角色）∪ moduleVisibility 自动授权的 manager 角色
 *
 * admin 用户：返回 ROLES 中全部角色（admin 不受限）
 * 非 admin：合并 zhaoRoles + resolveModuleVisibility 自动授权角色
 *
 * @param operatorId 操作者用户 ID
 * @param operatorTenantDocumentId 操作者当前租户 documentId（来自 ctx.state.siteDocumentId）
 * @returns 角色名数组（去重）
 */
async function computeOperatorOwnedRoles(
  operatorId: number,
  operatorTenantDocumentId?: string
): Promise<string[]> {
  const operator = await strapi.db.query(USER_UID).findOne({
    where: { id: operatorId },
    select: ["zhaoRoles"],
  });
  const operatorRoles: string[] = Array.isArray((operator as any)?.zhaoRoles)
    ? (operator as any).zhaoRoles
        .map((r: any) => (typeof r === "string" ? r : String(r)))
        .filter((r: string) => r && r.trim())
    : [];

  // admin 不受限：返回全部角色
  if (operatorRoles.includes("admin")) {
    const { ROLES } = await import("../permissions");
    return Object.values(ROLES);
  }

  // 非 admin：合并 moduleVisibility 自动授权的 manager 角色
  const ownedSet = new Set<string>(operatorRoles);
  try {
    const moduleVisibility = await strapi
      .plugin("zhao-auth")
      .service("permission")
      .resolveModuleVisibility(operatorTenantDocumentId);
    const { MODULE_MANAGER_MAP } = await import("../permissions");
    for (const [moduleKey, roles] of Object.entries(moduleVisibility)) {
      // 仅当 channel-admin 在该模块的授权角色列表中，才自动叠加对应 manager 角色
      if (roles.includes("channel-admin")) {
        const managerRole = (MODULE_MANAGER_MAP as any)[moduleKey];
        if (managerRole) {
          ownedSet.add(managerRole);
        }
      }
    }
  } catch {
    // resolveModuleVisibility 失败时不影响已有角色，仅忽略 auto 部分
  }
  return Array.from(ownedSet);
}

/**
 * 解析当前操作者渠道下的用户 ID 列表
 *
 * 实现说明（卡点 5 修正）：
 * - 原计划假设有 tenant-member 表，实际不存在
 * - user 与 site-config（租户）无直接关系，通过 channel-member 关联到 channel
 * - 现有 assignRole 已用 channel-member（isCurrent=true）做渠道校验，此处复用同一逻辑
 * - tenantDocumentId 参数保留（供 annotateUserRoles 的 moduleVisibility 解析使用），本函数不使用
 *
 * @param operatorId 操作者 ID
 * @param tenantDocumentId 当前租户 documentId（本函数未使用，保留参数以对齐调用方签名）
 * @returns 用户 ID 数组；返回 null 表示查询失败（不应过滤）；返回空数组表示无成员
 */
async function resolveTenantUserIds(
  operatorId: number,
  _tenantDocumentId?: string
): Promise<number[] | null> {
  try {
    // 1. 查操作者的当前渠道（isCurrent=true 的 channel-member 记录）
    const operatorChannels = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
      where: { user: operatorId, isCurrent: true },
      populate: { channel: { select: ["id"] } },
    });
    const operatorChannelIds = operatorChannels
      .map((cm: any) => cm.channel?.id)
      .filter(Boolean);
    if (operatorChannelIds.length === 0) return null;

    // 2. 查这些渠道下的所有成员
    const targetMembers = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
      where: { channel: { id: { $in: operatorChannelIds } } },
      populate: { user: { select: ["id"] } },
    });
    return targetMembers
      .map((m: any) => m.user?.id)
      .filter((id: any) => id != null) as number[];
  } catch {
    return null;
  }
}

/**
 * 为用户角色标注来源（core/auto/explicit）
 * 卡点 2：重叠时 explicit 优先于 auto
 * 卡点 4：admin 用户所有角色标注为 explicit
 *
 * @param user 用户对象（含 zhaoRoles + role）
 * @param tenantDocumentId 当前租户 documentId
 * @returns 角色数组，每项含 { role, label, source, sourceDescription }
 */
async function annotateUserRoles(user: any, _tenantDocumentId?: string) {
  const { ROLE_LABELS } = await import("../permissions");
  const directRoles = extractRoleNames(user);
  const isAdmin = directRoles.includes("admin");

  // 核心角色判定
  const CORE_ROLES = ["channel-admin", "instructor", "user", "plugin-manager", "admin"];

  // 只返回用户实际拥有的角色（zhaoRoles 中的角色）
  // 不再合并 moduleVisibility 自动授权角色（那些角色不在 zhaoRoles 中，撤销会失败）
  return directRoles.map((role: string) => {
    let source: "core" | "explicit" = "explicit";
    let sourceDescription = "显式分配";

    if (isAdmin) {
      source = "explicit";
      sourceDescription = "admin 显式分配";
    } else if (CORE_ROLES.includes(role)) {
      source = "core";
      sourceDescription = "核心角色";
    }

    return {
      role,
      label: (ROLE_LABELS as any)[role] || role,
      source,
      sourceDescription,
    };
  });
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
   * @param filters 筛选条件（支持 username/email/role）
   * @param page 页码
   * @param pageSize 每页数量
   * @param operatorId 操作者 ID（用于租户过滤）
   * @param tenantDocumentId 当前租户 documentId（来自 ctx.state.siteDocumentId）
   */
  async findUsers(
    filters: Record<string, any> = {},
    page = 1,
    pageSize = 20,
    operatorId?: number,
    tenantDocumentId?: string
  ) {
    const where: Record<string, any> = {};

    // 用户名/邮箱模糊搜索
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

    // 角色筛选（zhaoRoles 是 JSON 数组字段，用 $contains 模糊匹配）
    const roleFilter = filters['filters[role][$contains]'] || filters.role;
    if (roleFilter) {
      where.zhaoRoles = { $contains: roleFilter };
    }

    // 租户过滤：非 admin 只看当前租户用户
    let tenantUserIds: number[] | null = null;
    if (operatorId) {
      const operator = await strapi.db.query(USER_UID).findOne({
        where: { id: operatorId },
        select: ["zhaoRoles"],
      });
      const operatorRoles: string[] = Array.isArray((operator as any)?.zhaoRoles)
        ? (operator as any).zhaoRoles
            .map((r: any) => (typeof r === "string" ? r : String(r)))
            .filter((r: string) => r && r.trim())
        : [];

      const isAdmin = operatorRoles.includes("admin");
      if (!isAdmin) {
        // 卡点 5：通过 channel-member 关系过滤（isCurrent=true 找操作者当前渠道）
        tenantUserIds = await resolveTenantUserIds(operatorId, tenantDocumentId);
        if (tenantUserIds && tenantUserIds.length > 0) {
          where.id = { $in: tenantUserIds };
        } else if (tenantUserIds && tenantUserIds.length === 0) {
          // 已查询但无成员：返回空列表（避免 fallback 到全表）
          // 注意：返回 { list, pagination } 而非 { data, pagination }，匹配前端 extractList 优先分支
          return {
            list: [],
            pagination: { page, pageSize, total: 0, pageCount: 0 },
          };
        }
      }
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

    // 为每个用户计算角色来源标注（三色标签需要）
    const list = await Promise.all(
      users.map(async (user: any) => {
        const rolesWithSource = await annotateUserRoles(user, tenantDocumentId);
        return {
          id: user.id,
          documentId: user.id,
          username: user.username,
          email: user.email,
          roles: rolesWithSource.map((r: any) => r.role),
          roleSources: rolesWithSource,
          createdAt: user.createdAt,
        };
      })
    );

    // 返回 { list, pagination } 格式（而非 { data, pagination }）：
    // 前端 extractList 优先匹配 response.list 分支，能正确保留 pagination 字段
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
   * 分配角色给用户
   *
   * 业务约束：
   * - channel-admin 角色仅可分配给 ADMIN_CHANNEL_TIERS 渠道所有者
   * - 非 admin 操作者只能分配自己拥有的角色（子集校验，ROLE_006）
   * - 非 admin 操作者只能分配自己渠道内成员（ROLE_005）
   *
   * @param userId 用户ID
   * @param role 角色名称
   * @param operatorId 操作人ID
   * @param reason 操作原因
   * @param operatorTenantDocumentId 操作者当前租户 documentId（来自 ctx.state.siteDocumentId）
   */
  async assignRole(
    userId: number,
    role: string,
    operatorId: number,
    reason?: string,
    operatorTenantDocumentId?: string
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
    const isOperatorAdmin = operatorLevel >= 100;

    if (!isOperatorAdmin) {
      const targetLevel = await getRoleLevel(normalizedRole);
      if (targetLevel > operatorLevel) {
        throwErr("ROLE_004", 403, "不能分配同级或更高层级角色");
      }
    }

    // 渠道成员校验（非 admin）
    if (!isOperatorAdmin) {
      const operatorChannels = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
        where: { user: operatorId, isCurrent: true },
        populate: { channel: { select: ["id"] } },
      });
      const operatorChannelIds = operatorChannels.map((cm: any) => cm.channel?.id).filter(Boolean);
      if (operatorChannelIds.length === 0) {
        throwErr("ROLE_005", 403, "操作者未归属任何渠道");
      }

      const targetUserChannels = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
        where: { user: userId, channel: { id: { $in: operatorChannelIds } } },
      });
      if (targetUserChannels.length === 0) {
        throwErr("ROLE_005", 403, "只能分配自己渠道内成员");
      }
    }

    // ===== 子集校验（卡点 1：操作者只能分配自己拥有的角色，ROLE_006）=====
    if (!isOperatorAdmin) {
      const ownedRoles = await computeOperatorOwnedRoles(operatorId, operatorTenantDocumentId);
      if (!ownedRoles.includes(normalizedRole)) {
        throwErr(
          "ROLE_006",
          403,
          `只能分配自己拥有的角色，未拥有: ${normalizedRole}`
        );
      }
    }

    const newRoles = [...currentRoles, normalizedRole];

    await strapi.db.query(USER_UID).update({
      where: { id: userId },
      data: { zhaoRoles: newRoles },
    });

    // 非 admin 自动创建 role-channel 记录
    if (!isOperatorAdmin) {
      const operatorChannels = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
        where: { user: operatorId, isCurrent: true },
        populate: { channel: { select: ["id"] } },
      });
      const currentChannelId = operatorChannels[0]?.channel?.id;
      if (currentChannelId != null) {
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

  /**
   * 撤销用户角色
   * - 非 admin：渠道校验（只能撤销自己渠道内成员）+ 子集校验（只能撤销自己拥有的角色）
   * - 保留"至少一个角色"校验
   *
   * @param userId 用户ID
   * @param role 角色名称
   * @param operatorId 操作人ID
   * @param reason 操作原因
   * @param operatorTenantDocumentId 操作者当前租户 documentId
   */
  async revokeRole(
    userId: number,
    role: string,
    operatorId: number,
    reason?: string,
    operatorTenantDocumentId?: string
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

    // 层级 + 渠道 + 子集校验（非 admin）
    const operatorLevel = await getUserLevel(operatorId);
    const isOperatorAdmin = operatorLevel >= 100;

    if (!isOperatorAdmin) {
      // 渠道校验（与 assignRole 对称）
      const operatorChannels = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
        where: { user: operatorId, isCurrent: true },
        populate: { channel: { select: ["id"] } },
      });
      const operatorChannelIds = operatorChannels.map((cm: any) => cm.channel?.id).filter(Boolean);
      if (operatorChannelIds.length === 0) {
        throwErr("ROLE_005", 403, "操作者未归属任何渠道");
      }

      const targetUserChannels = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
        where: { user: userId, channel: { id: { $in: operatorChannelIds } } },
      });
      if (targetUserChannels.length === 0) {
        throwErr("ROLE_005", 403, "只能撤销自己渠道内成员的角色");
      }

      // 子集校验：只能撤销自己拥有的角色
      const ownedRoles = await computeOperatorOwnedRoles(operatorId, operatorTenantDocumentId);
      if (!ownedRoles.includes(role)) {
        throwErr(
          "ROLE_006",
          403,
          `只能撤销自己拥有的角色，未拥有: ${role}`
        );
      }
    }

    const newRoles = currentRoles.filter((r: string) => r !== role);

    await strapi.db.query(USER_UID).update({
      where: { id: userId },
      data: { zhaoRoles: newRoles },
    });

    invalidateUserCache(userId);
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
   * 获取用户详情（含角色来源标注）
   * @param userId 目标用户 ID
   * @param operatorId 操作者 ID（保留参数，便于未来加审计）
   * @param tenantDocumentId 当前租户 documentId
   */
  async getUserDetail(
    userId: number,
    operatorId?: number,
    tenantDocumentId?: string
  ) {
    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
      select: ["id", "email", "username", "createdAt", "zhaoRoles"],
      populate: ['role'],
    });

    if (!user) {
      throwErr("USER_NOT_FOUND", 404, "用户不存在");
    }

    const rolesWithSource = await annotateUserRoles(user, tenantDocumentId);

    // 按来源分组（前端详情弹窗分组展示）
    const bySource = {
      core: rolesWithSource.filter((r: any) => r.source === "core"),
      auto: rolesWithSource.filter((r: any) => r.source === "auto"),
      explicit: rolesWithSource.filter((r: any) => r.source === "explicit"),
    };

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
      roles: rolesWithSource,
      rolesBySource: bySource,
    };
  },

  /**
   * 获取当前操作者可分配的角色列表
   * - admin：返回全部角色（ROLES 全集 + 数据库自定义角色）
   * - 非 admin：返回"拥有的角色全集"（zhaoRoles ∪ moduleVisibility 自动授权）
   *
   * @param operatorId 操作者 ID
   * @param tenantDocumentId 当前租户 documentId
   */
  async getAssignableRoles(
    operatorId: number,
    tenantDocumentId?: string
  ) {
    const { ROLES, ROLE_LABELS } = await import("../permissions");

    // 1. 取操作者拥有的角色全集
    const ownedRoles = await computeOperatorOwnedRoles(operatorId, tenantDocumentId);
    const ownedSet = new Set(ownedRoles);

    // 2. 取数据库中所有已定义角色（含自定义）
    let dbRoles: any[] = [];
    try {
      dbRoles = await strapi.db.query(PERMISSION_UID).findMany({
        orderBy: { id: "asc" },
      });
    } catch {
      // 表不存在时仅用 ROLES 常量
    }

    // 3. 合并 ROLES 常量 + 数据库角色（去重，按 ROLES 常量优先）
    const allRoleNames = new Set<string>(Object.values(ROLES));
    for (const r of dbRoles) {
      if (r?.role) allRoleNames.add(r.role);
    }

    // 4. 过滤：admin 全部返回；非 admin 只返回 ownedSet 中的角色
    const operator = await strapi.db.query(USER_UID).findOne({
      where: { id: operatorId },
      select: ["zhaoRoles"],
    });
    const operatorRoles: string[] = Array.isArray((operator as any)?.zhaoRoles)
      ? (operator as any).zhaoRoles
          .map((r: any) => (typeof r === "string" ? r : String(r)))
          .filter((r: string) => r && r.trim())
      : [];
    const isAdmin = operatorRoles.includes("admin");

    const result: Array<{ role: string; label: string; source: "core" | "auto" | "explicit" }> = [];
    for (const role of allRoleNames) {
      if (!isAdmin && !ownedSet.has(role)) continue;

      // 来源标注（复用 annotateUserRoles 逻辑：把 operator 当作用户来标注）
      let source: "core" | "auto" | "explicit" = "explicit";
      if (isAdmin) {
        source = "explicit";
      } else {
        const CORE_ROLES = ["channel-admin", "instructor", "user", "plugin-manager", "admin"];
        // 计算自动授权角色
        let autoRoles = new Set<string>();
        try {
          const moduleVisibility = await strapi
            .plugin("zhao-auth")
            .service("permission")
            .resolveModuleVisibility(tenantDocumentId);
          const { MODULE_MANAGER_MAP } = await import("../permissions");
          for (const [moduleKey, roles] of Object.entries(moduleVisibility)) {
            if (roles.includes("channel-admin")) {
              const managerRole = (MODULE_MANAGER_MAP as any)[moduleKey];
              if (managerRole) autoRoles.add(managerRole);
            }
          }
        } catch {
          // 忽略
        }
        if (autoRoles.has(role) && operatorRoles.includes(role)) {
          source = "explicit"; // 重叠时 explicit 优先
        } else if (autoRoles.has(role)) {
          source = "auto";
        } else if (CORE_ROLES.includes(role)) {
          source = "core";
        } else {
          source = "explicit";
        }
      }

      result.push({
        role,
        label: (ROLE_LABELS as any)[role] || role,
        source,
      });
    }

    return {
      roles: result,
      isAdmin,
    };
  },

  /**
   * 批量分配角色
   * 透传 operatorTenantDocumentId 给 assignRole，自动执行子集校验
   */
  async batchAssignRoles(
    userIds: number[],
    role: string,
    operatorId: number,
    reason?: string,
    operatorTenantDocumentId?: string
  ) {
    const results: { userId: number; success: boolean; message: string }[] = [];

    for (const userId of userIds) {
      try {
        await this.assignRole(userId, role, operatorId, reason, operatorTenantDocumentId);
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