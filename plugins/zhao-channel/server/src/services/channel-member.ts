import type { Core } from "@strapi/strapi";

function throwErr(code: string, status: number, message: string): never {
  const e: any = new Error(message);
  e.code = code;
  e.status = status;
  throw e;
}

const CHANNEL_UID = "plugin::zhao-channel.channel";
const CHANNEL_MEMBER_UID = "plugin::zhao-channel.channel-member";
const USER_UID = "plugin::users-permissions.user";
const USER_INVITE_UID = "plugin::zhao-channel.user-invite";

function formatChannel(channel: any) {
  if (!channel) return null;
  return {
    id: channel.id,
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
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async verifyInvitationCode(code: string) {
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
      },
    };
  },

  async getMyChannel(userId: number) {
    const currentMember = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
      where: { user: userId, isCurrent: true },
      populate: ["channel"],
    });
    if (!currentMember?.channel) return null;

    const channelId = typeof currentMember.channel === "object"
      ? currentMember.channel.id
      : currentMember.channel;

    const channel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id: channelId },
      populate: ["parentChannel"],
    });

    if (!channel) return null;
    return { channel: formatChannel(channel) };
  },

  async updateMyChannel(userId: number, data: { name?: string; description?: string }) {
    const currentMember = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
      where: { user: userId, isCurrent: true },
      populate: ["channel"],
    });
    if (!currentMember?.channel) {
      throwErr("000201", 400, "用户未关联渠道");
    }

    const channelId = typeof currentMember.channel === "object"
      ? currentMember.channel.id
      : currentMember.channel;

    const channel = await strapi.db.query(CHANNEL_UID).update({
      where: { id: channelId },
      data,
    });

    return { channel: formatChannel(channel) };
  },

  async inviteMember(channelId: number, inviterId: number, data: { email: string; role?: string }) {
    if (!data.email || data.email.trim() === "") {
      throwErr("000201", 400, "邮箱不能为空");
    }

    const channel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id: channelId },
    });
    if (!channel) {
      throwErr("000201", 404, "渠道不存在");
    }

    let user = await strapi.db.query(USER_UID).findOne({
      where: { email: data.email },
    });

    const isNewUser = !user;

    // 定义高级渠道层级（注册时自动获得 channel-admin 角色）
      const ADMIN_CHANNEL_TIERS = ['core', 'senior', 'global', 'authorized', 'official', 'partner'];

      if (!user) {
      // 创建未注册用户
      const userRole = ADMIN_CHANNEL_TIERS.includes(channel.channelTier as string) && data.role === "admin"
        ? ['channel-admin', 'user']
        : ['user'];

      user = await strapi.entityService.create(USER_UID, {
        data: {
          email: data.email,
          username: data.email.split("@")[0],
          provider: "local",
          confirmed: false,
          zhaoRoles: userRole,
        },
      });

      // ── 新用户同时创建 channel-member，并标记为当前渠道 ──
      await strapi.db.query(CHANNEL_MEMBER_UID).create({
        data: {
          channel: channelId,
          user: user.id,
          role: data.role || "member",
          invitedBy: inviterId,
          isCurrent: true,
        },
      });

      // ── 新用户同时创建 user-invite 记录（与分销体系打通）──
      try {
        const userInviteService = strapi.plugin("zhao-channel").service("user-invite");
        // 查找邀请人的邀请码
        const inviterInvite = await strapi.db.query(USER_INVITE_UID).findOne({
          where: { user: inviterId },
        });
        await userInviteService.createForUser(
          user.id,
          inviterInvite?.inviteCode || undefined,
          channelId
        );
      } catch (err: any) {
        strapi.log.error(
          `[zhao-channel] Failed to create user-invite for invited user ${user.id}: ${err.message}`
        );
      }
    } else {
      const existingMember = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
        where: { channel: channelId, user: user.id },
      });

      if (!existingMember) {
        await strapi.db.query(CHANNEL_MEMBER_UID).create({
          data: {
            channel: channelId,
            user: user.id,
            role: data.role || "member",
            invitedBy: inviterId,
          },
        });
      }
    }

    return {
      invitation: {
        channel: {
          id: channel.id,
          name: channel.name,
        },
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        isNewUser,
      },
    };
  },

  async getMembers(channelId: number) {
    const members = await strapi.db.query(CHANNEL_MEMBER_UID).findMany({
      where: { channel: channelId },
      populate: ["user"],
    });

    return {
      members: members.map((m: any) => ({
        id: m.user?.id,
        username: m.user?.username,
        email: m.user?.email,
        role: m.role,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    };
  },

  async removeMember(channelId: number, userId: number) {
    const channel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id: channelId },
    });
    if (!channel) {
      throwErr("000201", 404, "渠道不存在");
    }

    const member = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
      where: { channel: channelId, user: userId },
    });
    if (!member) {
      throwErr("000201", 404, "成员不存在");
    }

    await strapi.db.query(CHANNEL_MEMBER_UID).delete({
      where: { channel: channelId, user: userId },
    });
    return null;
  },

  async updateMemberRole(channelId: number, userId: number, newRole: string) {
    const member = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
      where: { channel: channelId, user: userId },
    });
    if (!member) {
      throwErr("000201", 404, "成员不存在");
    }

    await strapi.db.query(CHANNEL_MEMBER_UID).update({
      where: { id: member.id },
      data: { role: newRole },
    });

    return null;
  },

  /**
   * 通过渠道邀请码加入渠道（C端/Web后台）
   */
  async joinByInvite(userId: number, inviteCode: string) {
    // 1. 验证邀请码
    const channel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { code: inviteCode },
    });

    if (!channel) {
      throwErr("030101", 404, "邀请码不存在或已过期");
    }

    if (!channel.status) {
      throwErr("030104", 403, "渠道已被禁用");
    }

    // 2. 检查用户是否已经是成员
    const existingMember = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
      where: { channel: channel.id, user: userId },
    });

    if (existingMember) {
      return {
        channelId: channel.id,
        channelName: channel.name,
        role: existingMember.role,
        isNewMember: false,
      };
    }

    // 3. 创建成员记录
    const member = await strapi.db.query(CHANNEL_MEMBER_UID).create({
      data: {
        channel: channel.id,
        user: userId,
        role: "member",
        isCurrent: false,
      },
    });

    // 4. 创建user-invite记录（建立分销关系）
    try {
      const userInviteService = strapi.plugin("zhao-channel").service("user-invite");
      await userInviteService.createForUser(userId, undefined, channel.id);
    } catch (err: any) {
      strapi.log.error(
        `[zhao-channel] Failed to create user-invite for joined user ${userId}: ${err.message}`
      );
    }

    return {
      channelId: channel.id,
      channelName: channel.name,
      role: member.role,
      isNewMember: true,
    };
  },

  /**
   * 简单 CRUD 方法（管理端用）
   */
  async find(query: any = {}) {
    const { channel, page, pageSize, populate, ...filters } = query;
    const params: any = { where: filters };
    if (populate) {
      params.populate = typeof populate === "string" ? populate : ["user", "channel"];
    } else {
      params.populate = ["user", "channel"];
    }
    if (channel) {
      params.where = { ...params.where, channel: { documentId: { $eq: channel } } };
    }
    if (page || pageSize) {
      params.offset = ((parseInt(page, 10) || 1) - 1) * (parseInt(pageSize, 10) || 10);
      params.limit = parseInt(pageSize, 10) || 10;
    }
    return strapi.db.query(CHANNEL_MEMBER_UID).findMany(params);
  },

  async findOne(id: number) {
    return strapi.db.query(CHANNEL_MEMBER_UID).findOne({ where: { id }, populate: ["user", "channel"] });
  },

  async createMember(data: any) {
    return strapi.db.query(CHANNEL_MEMBER_UID).create({ data });
  },

  async updateMember(id: number, data: any) {
    return strapi.db.query(CHANNEL_MEMBER_UID).update({ where: { id }, data });
  },

  async deleteMember(id: number) {
    return strapi.db.query(CHANNEL_MEMBER_UID).delete({ where: { id } });
  },

  async setCurrentChannel(userId: number, channelId: number) {
    // 先清除该用户所有 channel-member 的 isCurrent
    await strapi.db.query(CHANNEL_MEMBER_UID).updateMany({
      where: { user: userId },
      data: { isCurrent: false },
    });

    // 设置新的当前渠道
    const existing = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
      where: { user: userId, channel: channelId },
    });
    if (existing) {
      return strapi.db.query(CHANNEL_MEMBER_UID).update({
        where: { id: existing.id },
        data: { isCurrent: true },
      });
    } else {
      return strapi.db.query(CHANNEL_MEMBER_UID).create({
        data: { user: userId, channel: channelId, isCurrent: true },
      });
    }
  },
});
