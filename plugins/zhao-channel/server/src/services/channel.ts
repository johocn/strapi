import type { Core } from "@strapi/strapi";
import {
  buildPath,
  parsePathIds,
  getPathPrefix,
  getDescendantIdsByPath,
} from "../utils/path";
import {
  ROOT_TIER,
  isLeafTier,
  getOnlyChildTier,
  getChildTiers,
  MAX_CHANNEL_DEPTH,
  validateTier,
} from "../config/tiers";

const XSS_PATTERN = /<\s*script|<\s*\/\s*script|javascript\s*:|on\w+\s*=/i;

function throwErr(code: string, status: number, message: string): never {
  const e: any = new Error(message);
  e.code = code;
  e.status = status;
  throw e;
}

const CHANNEL_UID = "plugin::zhao-channel.channel";
const CHANNEL_MEMBER_UID = "plugin::zhao-channel.channel-member";
const USER_CHANNEL_UID = "plugin::zhao-channel.user-channel";
const ROLE_CHANNEL_UID = "plugin::zhao-auth.role-channel";

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function formatChannel(channel: any) {
  if (!channel) return null;
  return {
    id: channel.id,
    documentId: channel.documentId,
    attributes: {
      name: channel.name,
      code: channel.code,
      description: channel.description,
      channelTier: channel.channelTier,
      status: channel.status,
      path: channel.path,
      depth: channel.depth,
      parentChannelId: channel.parentChannel
        ? { id: channel.parentChannel.id, name: channel.parentChannel.name }
        : null,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    },
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 查询渠道列表
   */
  async find(query: any = {}) {
    const { page = 1, pageSize = 20, site, filters: queryFilters, ...rest } = query;

    // 合并 filters：兼容 ?site=xxx 和 ?filters[site]=xxx 两种形式
    const filters: any = { ...queryFilters, ...rest };

    // site 参数转为 manyToMany 关系查询（channel.sites）
    // Strapi v5 db.query 对 manyToMany 关系过滤语法不稳定，改用直接查中间表 + $in 过滤
    const siteValue = site || filters.site;
    if (siteValue) {
      delete filters.site;
      const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
        where: { documentId: siteValue },
        select: ["id"],
      });
      if (!siteConfig) {
        return {
          list: [],
          pagination: { page: Number(page), pageSize: Number(pageSize), total: 0, pageCount: 0 },
        };
      }
      // 直接查中间表 zhao_channels_sites_lnk 拿到该站点关联的所有 channel_id
      const knex = strapi.db.connection;
      const linkRows = await knex("zhao_channels_sites_lnk")
        .where("site_config_id", siteConfig.id)
        .select("channel_id");
      const channelIds = linkRows.map((r: any) => r.channel_id);
      if (channelIds.length === 0) {
        return {
          list: [],
          pagination: { page: Number(page), pageSize: Number(pageSize), total: 0, pageCount: 0 },
        };
      }
      filters.id = { $in: channelIds };
    }

    const channels = await strapi.db.query(CHANNEL_UID).findMany({
      where: filters,
      offset: (page - 1) * pageSize,
      limit: pageSize,
      populate: ["parentChannel"],
    });

    const total = await strapi.db.query(CHANNEL_UID).count({ where: filters });

    return {
      list: channels.map(formatChannel),
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  },

  /**
   * 查询单个渠道
   */
  async findOne(id: number) {
    if (typeof id !== "number" || !Number.isFinite(id)) {
      throwErr("030114", 400, "无效的渠道 ID");
    }
    const channel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id },
      populate: ["parentChannel"],
    });
    if (!channel) return null;
    return formatChannel(channel);
  },

  /**
   * 创建渠道（在已有父渠道下创建）
   */
  async create(data: any) {
    if (!data.name || !data.name.trim()) {
      throwErr("030111", 400, "渠道名称不能为空");
    }

    if (data.channelTier && !validateTier(data.channelTier)) {
      throwErr("030112", 400, `无效的渠道层级: ${data.channelTier}`);
    }

    if (XSS_PATTERN.test(data.name) || (data.description && XSS_PATTERN.test(data.description))) {
      throwErr("030113", 400, "输入包含不允许的内容");
    }

    const code = data.code || generateCode();

    // 计算 path 和 depth
    let path = "/";
    let depth = 0;
    let parent: any = null;

    if (data.parentChannel) {
      const parentId =
        typeof data.parentChannel === "object"
          ? data.parentChannel.id || data.parentChannel
          : data.parentChannel;
      parent = await strapi.db.query(CHANNEL_UID).findOne({
        where: { id: parentId },
      });
      if (parent) {
        // 校验层级深度
        if (isLeafTier(parent.channelTier)) {
          throwErr("030105", 400, "渠道层级深度超限（最大 " + MAX_CHANNEL_DEPTH + " 级）");
        }
        path = parent.path || "/";
        depth = (parent.depth || 0) + 1;
      }
    }

    const channel = await strapi.db.query(CHANNEL_UID).create({
      data: { ...data, code, path, depth },
    });

    // 创建后更新 path：需要用真实 id 替换占位的路径
    if (!data.parentChannel) {
      // 根节点：path = /id/
      const updatedPath = `/${channel.id}/`;
      const updated = await strapi.db.query(CHANNEL_UID).update({
        where: { id: channel.id },
        data: { path: updatedPath, depth: 0 },
      });
      return formatChannel(updated);
    }

    // 非根节点：path = parentPath + id/
    const updatedPath = buildPath(parent?.path || "/", channel.id);
    const updatedDepth = (parent?.depth || 0) + 1;
    const updated = await strapi.db.query(CHANNEL_UID).update({
      where: { id: channel.id },
      data: { path: updatedPath, depth: updatedDepth },
    });
    const updatedWithParent = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id: updated.id },
      populate: ["parentChannel"],
    });
    return formatChannel(updatedWithParent);
  },

  /**
   * 更新渠道
   * 如果 parentChannel 变更，需要递归更新所有子孙的 path
   */
  async update(id: number, data: any) {
    if (typeof id !== "number" || !Number.isFinite(id)) {
      throwErr("030114", 400, "无效的渠道 ID");
    }
    const original = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id },
    });
    if (!original) {
      throwErr("000201", 404, "渠道不存在");
    }

    const hasParentChanged =
      data.parentChannel !== undefined &&
      data.parentChannel !== (original.parentChannel?.id || original.parentChannel);

    // 常规更新
    await strapi.db.query(CHANNEL_UID).update({
      where: { id },
      data,
    });

    // 如果 parentChannel 变更，重新计算 path 和 depth，并更新所有子孙
    if (hasParentChanged && data.parentChannel !== null) {
      const newParentId =
        typeof data.parentChannel === "object"
          ? data.parentChannel.id || data.parentChannel
          : data.parentChannel;
      const newParent = await strapi.db.query(CHANNEL_UID).findOne({
        where: { id: newParentId },
      });

      const oldPath = original.path;
      const newPath = buildPath(newParent?.path || "/", id);
      const newDepth = (newParent?.depth || 0) + 1;

      // 校验是否超出层级限制
      if (newParent && isLeafTier(newParent.channelTier)) {
        throwErr("030105", 400, "渠道层级深度超限（最大 " + MAX_CHANNEL_DEPTH + " 级）");
      }

      // 更新自身 path 和 depth
      await strapi.db.query(CHANNEL_UID).update({
        where: { id },
        data: { path: newPath, depth: newDepth },
      });

      // 更新所有子孙的 path（替换旧前缀）
      if (oldPath && oldPath !== "/") {
        const descendants = await strapi.db.query(CHANNEL_UID).findMany({
          where: { path: { $startsWith: oldPath } },
          select: ["id", "path", "depth"],
        });

        for (const desc of descendants) {
          if (desc.id === id) continue;
          const relativePath = desc.path.substring(oldPath.length);
          const newDescPath = newPath + relativePath;
          const oldDepthOffset = desc.path
            ? desc.path.split("/").filter(Boolean).length - 1
            : 0;
          const depthDiff = newDepth - (original.depth || 0);
          const newDescDepth = oldDepthOffset + depthDiff;
          await strapi.db.query(CHANNEL_UID).update({
            where: { id: desc.id },
            data: { path: newDescPath, depth: newDescDepth },
          });
        }
      }

      // 重新读取更新后的数据
      const updated = await strapi.db.query(CHANNEL_UID).findOne({
        where: { id },
        populate: ["parentChannel"],
      });
      return formatChannel(updated);
    }

    if (hasParentChanged && data.parentChannel === null) {
      // 变为根节点
      const newPath = `/${id}/`;
      await strapi.db.query(CHANNEL_UID).update({
        where: { id },
        data: { path: newPath, depth: 0 },
      });
    }

    const final = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id },
      populate: ["parentChannel"],
    });
    return formatChannel(final);
  },

  /**
   * 删除渠道（级联删除，使用事务保证一致性）
   * 1. 检查渠道是否存在
   * 2. 通过 path 查询所有子孙渠道
   * 3. 收集受影响的用户 ID
   * 4. 在单个事务内：删除关联 + 从叶子到根删除 channels
   * 5. 清理 Redis 缓存
   */
  async delete(id: number) {
    if (typeof id !== "number" || !Number.isFinite(id)) {
      throwErr("030114", 400, "无效的渠道 ID");
    }
    const channel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id },
    });
    if (!channel) {
      throwErr("000201", 404, "渠道不存在");
    }

    // 获取所有待删除的渠道 ID（含自身）
    const allDescendantIds = await getDescendantIdsByPath(strapi, channel.path, false);
    const deleteIds = allDescendantIds.length > 0
      ? allDescendantIds
      : [id];

    // 收集所有受影响的用户 ID（用于后续缓存清理）
    const affectedUserIds = new Set<number>();

    // 通过 channel_members 获取受影响用户
    const members = await strapi.db.query(CHANNEL_MEMBER_UID).findMany({
      where: { channel: { $in: deleteIds } },
      populate: ["user"],
    });
    for (const m of members) {
      if (m.user) {
        const uid = typeof m.user === "object" ? m.user.id : m.user;
        if (uid) affectedUserIds.add(uid);
      }
    }

    // 通过 user_channels 获取受影响用户
    const userChans = await strapi.db.query(USER_CHANNEL_UID).findMany({
      where: { channel: { $in: deleteIds } },
      populate: ["user"],
    });
    for (const uc of userChans) {
      if (uc.user) {
        const uid = typeof uc.user === "object" ? uc.user.id : uc.user;
        if (uid) affectedUserIds.add(uid);
      }
    }

    // 在事务中执行所有删除操作
    const result = await strapi.db.transaction(async (_trx: any) => {
      // 删除 channel_members
      let deletedMembers: number = 0;
      if (deleteIds.length > 0) {
        const res = await strapi.db.query(CHANNEL_MEMBER_UID).deleteMany({
          where: { channel: { $in: deleteIds } },
        });
        deletedMembers = typeof res === "number" ? res : Number(res) || 0;
      }

      // 删除 user_channels
      let deletedUserChannels: number = 0;
      if (deleteIds.length > 0) {
        const res = await strapi.db.query(USER_CHANNEL_UID).deleteMany({
          where: { channel: { $in: deleteIds } },
        });
        deletedUserChannels = typeof res === "number" ? res : Number(res) || 0;
      }

      // 删除 role_channels
      let deletedRoleChannels: number = 0;
      if (deleteIds.length > 0) {
        const res = await strapi.db.query(ROLE_CHANNEL_UID).deleteMany({
          where: { channel: { $in: deleteIds } },
        });
        deletedRoleChannels = typeof res === "number" ? res : Number(res) || 0;
      }

      // 按 depth DESC 排序删除渠道（先删叶子，再删自身）
      const channelsToDelete: any[] = await strapi.db.query(CHANNEL_UID).findMany({
        where: { id: { $in: deleteIds } },
        select: ["id", "depth", "name"],
      });
      channelsToDelete.sort((a, b) => (b.depth || 0) - (a.depth || 0));

      let deletedChannels = 0;
      for (const ch of channelsToDelete) {
        await strapi.db.query(CHANNEL_UID).delete({
          where: { id: ch.id },
        });
        deletedChannels++;
      }

      return { deletedChannels, deletedMembers, deletedUserChannels, deletedRoleChannels };
    });

    // 清理受影响的用户缓存（异步引入 redis 模块避免循环依赖）
    try {
      const { deleteUserAllChannelsCache, clearAllChannelCache } = await import(
        "../utils/redis"
      );
      for (const uid of affectedUserIds) {
        await deleteUserAllChannelsCache(uid);
      }
      await clearAllChannelCache();
    } catch {
      // redis 不可用时静默忽略
    }

    return {
      ...result,
      affectedUsers: affectedUserIds.size,
    };
  },

  /**
   * 创建根渠道（root 级别）
   */
  async createRoot(data: { name: string; description?: string }) {
    const code = generateCode();
    const channel = await strapi.db.query(CHANNEL_UID).create({
      data: {
        name: data.name,
        code,
        description: data.description,
        channelTier: ROOT_TIER,
        status: true,
        path: "/",
        depth: 0,
      },
    });

    // 用真实 id 更新 path
    const updatedPath = `/${channel.id}/`;
    const updated = await strapi.db.query(CHANNEL_UID).update({
      where: { id: channel.id },
      data: { path: updatedPath },
    });

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      description: updated.description,
      channelTier: updated.channelTier,
      path: updated.path,
      depth: updated.depth,
    };
  },

  /**
   * 通过邀请码注册子渠道，并创建登录用户
   */
  async register(data: {
    code: string;
    name: string;
    description?: string;
    channelTier?: string;
    email?: string;
    username?: string;
    password?: string;
  }) {
    const parentChannel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { code: data.code },
    });
    if (!parentChannel) {
      throwErr("030101", 404, "邀请码不存在或已过期");
    }
    if (!parentChannel.status) {
      throwErr("030104", 403, "渠道已被禁用");
    }

    // 校验父渠道是否为叶子节点
    if (isLeafTier(parentChannel.channelTier)) {
      throwErr("030105", 400, "渠道层级深度超限");
    }

    // 推断子层级
    let childTier = data.channelTier;
    if (!childTier) {
      childTier = getOnlyChildTier(parentChannel.channelTier);
      if (!childTier) {
        // root 下有多个可选子层级，必须传参
        throwErr("030109", 400, "root 渠道下注册必须指定 channelTier");
      }
    } else {
      // 验证指定层级是否在允许列表中
      const allowed = getChildTiers(parentChannel.channelTier);
      if (!allowed.includes(childTier)) {
        throwErr("030110", 403, `不允许在 "${parentChannel.channelTier}" 下注册 "${childTier}"`);
      }
    }

    const code = generateCode();
    const parentPath = parentChannel.path || "/";
    const childDepth = (parentChannel.depth || 0) + 1;

    // 先创建渠道，得到 id 后再构建 path
    const channel = await strapi.db.query(CHANNEL_UID).create({
      data: {
        name: data.name,
        code,
        description: data.description,
        channelTier: childTier,
        parentChannel: parentChannel.id,
        status: true,
        path: "/", // 占位，下一步更新
        depth: childDepth,
      },
    });

    // 用真实 id 更新 path
    const updatedPath = buildPath(parentPath, channel.id);
    const updated = await strapi.db.query(CHANNEL_UID).update({
      where: { id: channel.id },
      data: { path: updatedPath },
    });

    // ─── 创建登录用户 ───
    let user: any = null;
    if (data.email && data.username && data.password) {
      // 检查邮箱是否已被注册
      const existingUserByEmail = await strapi.db.query("plugin::users-permissions.user").findOne({
        where: { email: data.email },
      });
      if (existingUserByEmail) {
        throwErr("030107", 409, "该邮箱已被注册");
      }

      // 检查用户名是否已被注册
      const existingUserByUsername = await strapi.db.query("plugin::users-permissions.user").findOne({
        where: { username: data.username },
      });
      if (existingUserByUsername) {
        throwErr("030108", 409, "该用户名已被注册");
      }

      // 定义高级渠道层级（注册时自动获得 channel-admin 角色）
      // agent 是 root 的直接子级（与 core/senior/.../partner 平级），应自动成为 channel-admin
      const ADMIN_CHANNEL_TIERS = ['core', 'senior', 'global', 'authorized', 'official', 'partner', 'agent'];

      // 确定用户角色：高级渠道注册自动分配 channel-admin
      const userRoles = ADMIN_CHANNEL_TIERS.includes(childTier) 
        ? ['channel-admin', 'user'] 
        : ['user'];

      // 创建用户（用 entityService 确保密码被哈希）
      user = await strapi.entityService.create("plugin::users-permissions.user", {
        data: {
          email: data.email,
          username: data.username,
          password: data.password,
          provider: "local",
          confirmed: true,
          zhaoRoles: userRoles,
        },
      });

      // 创建 channel-member（注册者永远是渠道所有者，role 恒为 admin）
      await strapi.db.query(CHANNEL_MEMBER_UID).create({
        data: {
          channel: updated.id,
          user: user.id,
          role: "admin",
          isCurrent: true,
        },
      });

      // 显式授权用户访问自己的渠道（与 channel-member 双表冗余，语义分离）
      // user-channel：访问授权；channel-member：成员关系
      try {
        await strapi.db.query(USER_CHANNEL_UID).create({
          data: {
            user: user.id,
            channel: updated.id,
            grantedBy: "self-register",
          },
        });
      } catch (e: any) {
        // user-channel 写入失败不阻断注册（channel-member 已建，shao 仍可通过 channel-member 拿到渠道）
        strapi.log.warn(`[zhao-channel] register() failed to write user-channel: ${e.message}`);
      }

      // 更新 user-invite 记录（bootstrap 的 afterCreate hook 已自动创建）
      const parentOwner = await strapi.db
        .query(CHANNEL_MEMBER_UID)
        .findOne({
          where: { channel: parentChannel.id, role: "admin" },
          populate: ["user"],
        });

      if (parentOwner?.user) {
        const parentUserId = typeof parentOwner.user === "object" ? parentOwner.user.id : parentOwner.user;
        const inviterInvite = await strapi.db
          .query("plugin::zhao-channel.user-invite")
          .findOne({
            where: { user: parentUserId },
          });

        if (inviterInvite) {
          // 构建分销路径
          let distributionPath = `/${user.id}/`;
          let distributionDepth = 0;

          if ((inviterInvite.distributionDepth || 0) < 2) {
            const parentDistPath = inviterInvite.distributionPath || "/";
            distributionPath = buildPath(parentDistPath, user.id);
            distributionDepth = (inviterInvite.distributionDepth || 0) + 1;
          }

          const autoInvite = await strapi.db
            .query("plugin::zhao-channel.user-invite")
            .findOne({
              where: { user: user.id },
            });

          if (autoInvite) {
            await strapi.db.query("plugin::zhao-channel.user-invite").update({
              where: { id: autoInvite.id },
              data: {
                invitedBy: parentUserId,
                inviteChannel: updated.id,
                inviteMethod: "invite_code",
                distributionPath,
                distributionDepth,
              },
            });
          }
        }
      }
    }

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      description: updated.description,
      channelTier: updated.channelTier,
      path: updated.path,
      depth: updated.depth,
      parentChannelId: parentChannel.id,
      ...(user ? {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      } : {}),
    };
  },

  /**
   * 获取渠道网络（父+直接子渠道）
   */
  async getNetwork(id: number) {
    const channel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id },
      populate: ["parentChannel"],
    });
    if (!channel) return null;

    const children = await strapi.db.query(CHANNEL_UID).findMany({
      where: { parentChannel: id },
      populate: ["parentChannel"],
    });

    return {
      channel: formatChannel(channel),
      children: children.map(formatChannel),
    };
  },

  /**
   * 验证邀请码
   */
  async validateCode(code: string) {
    const channel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { code },
    });
    if (!channel || !channel.status) {
      return { ok: true, valid: false };
    }
    return {
      ok: true,
      valid: true,
      channel: {
        id: channel.id,
        name: channel.name,
        code: channel.code,
        channelTier: channel.channelTier,
        path: channel.path,
        depth: channel.depth,
      },
    };
  },

  /**
   * 获取完整层级树（使用 path 前缀一次性查询后再组装）
   */
  async getHierarchy(id: number) {
    const channel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id },
    });
    if (!channel) return null;

    // 一次性查询所有子孙节点
    const prefix = getPathPrefix(channel.path);
    const allDescendants = await strapi.db.query(CHANNEL_UID).findMany({
      where: {
        $and: [
          { path: { $startsWith: prefix } },
          { id: { $ne: id } },
        ],
      },
    });

    // 在内存中组装树
    const nodeMap = new Map<number, any>();
    nodeMap.set(channel.id, {
      id: channel.id,
      name: channel.name,
      code: channel.code,
      channelTier: channel.channelTier,
      path: channel.path,
      depth: channel.depth,
      children: [],
    });

    for (const desc of allDescendants) {
      nodeMap.set(desc.id, {
        id: desc.id,
        name: desc.name,
        code: desc.code,
        channelTier: desc.channelTier,
        path: desc.path,
        depth: desc.depth,
        children: [],
      });
    }

    // 按 depth 升序排序，确保父节点先被处理
    const sorted = [...allDescendants].sort((a, b) => (a.depth || 0) - (b.depth || 0));

    for (const desc of sorted) {
      const parentId = desc.parentChannel?.id || parsePathIds(desc.path).slice(-2, -1)[0];
      if (parentId && nodeMap.has(parentId)) {
        const node = nodeMap.get(desc.id);
        if (node) {
          nodeMap.get(parentId)!.children.push(node);
        }
      }
    }

    return { hierarchy: nodeMap.get(channel.id) };
  },

  /**
   * 获取渠道统计（使用 path 前缀计算子渠道数量）
   */
  async getStats(id: number) {
    const channel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id },
    });
    if (!channel) return null;

    // 使用 path 前缀直接查询子渠道数量
    const descendantIds = await getDescendantIdsByPath(strapi, channel.path, true);
    const subChannelCount = descendantIds.length;

    // 统计自身成员数
    const memberCount = Number(await strapi.db.query(CHANNEL_MEMBER_UID).count({
      where: { channel: id },
    }));

    // 统计所有子孙渠道的成员数
    let totalSubMembers = 0;
    if (descendantIds.length > 0) {
      totalSubMembers = Number(await strapi.db.query(CHANNEL_MEMBER_UID).count({
        where: { channel: { $in: descendantIds } },
      }));
    }

    return {
      stats: {
        id: channel.id,
        name: channel.name,
        depth: channel.depth,
        path: channel.path,
        memberCount,
        subChannelCount,
        totalSubMembers,
        totalMembers: memberCount + totalSubMembers,
      },
    };
  },

  /**
   * 获取渠道维度的分销统计（委派 user-invite service）
   */
  async getChannelDistributionStats(id: number) {
    const channel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id },
    });
    if (!channel) return null;

    // 委派给 user-invite service 获取渠道维度的分销统计
    const stats = await strapi
      .plugin("zhao-channel")
      .service("user-invite")
      .getChannelDistributionStats(id);

    return {
      stats: {
        id: channel.id,
        name: channel.name,
        code: channel.code,
        depth: channel.depth,
        channelTier: channel.channelTier,
        path: channel.path,
        directCustomerCount: stats.directCustomerCount,
        subChannelCustomerCount: stats.subChannelCustomerCount,
        totalCustomerCount: stats.totalCustomerCount,
      },
    };
  },

  /**
   * 获取公开渠道信息
   */
  async getPublic(id: number) {
    const channel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id },
    });
    if (!channel) return null;
    return {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      channelTier: channel.channelTier,
      path: channel.path,
      depth: channel.depth,
      createdAt: channel.createdAt,
    };
  },

  /**
   * 获取用户可访问的渠道 ID 列表（委托给 channel-permission 服务，包含缓存）
   */
  async getAccessibleChannelIds(userId: number): Promise<number[]> {
    return strapi
      .plugin("zhao-channel")
      .service("channel-permission")
      .getUserAllChannels(userId);
  },
});