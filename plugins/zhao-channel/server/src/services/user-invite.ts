import type { Core } from "@strapi/strapi";
import { buildPath, parsePathIds } from "../utils/path";

const USER_INVITE_UID = "plugin::zhao-channel.user-invite";
const USER_UID = "plugin::users-permissions.user";
const CHANNEL_UID = "plugin::zhao-channel.channel";
const CHANNEL_MEMBER_UID = "plugin::zhao-channel.channel-member";

const MAX_DISTRIBUTION_DEPTH = 2;

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 生成未使用的邀请码（最多重试 5 次避免碰撞）
   */
  async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = generateInviteCode();
      const existing = await strapi.db.query(USER_INVITE_UID).findOne({
        where: { inviteCode: code },
      });
      if (!existing) return code;
    }
    // 极低概率碰撞，扩位重试
    return Math.random().toString(36).substring(2, 12).toUpperCase();
  },

  /**
   * 为用户创建 user-invite 记录
   * @param userId 用户 ID
   * @param inviterCode 邀请码（可选，被邀请时传入）
   * @param inviteChannelId 邀请人所属渠道 ID（可选）
   * @param externalInviteCode 外部邀请码（可选，SSO 生成时直接使用，跳过本地生成）
   * @param channelCode 渠道编码（可选，优先于 inviteChannelId，自动解析为 channelId）
   */
  async createForUser(
    userId: number,
    inviterCode?: string,
    inviteChannelId?: number,
    externalInviteCode?: string,
    channelCode?: string
  ): Promise<any> {
    // channelCode 优先解析为 inviteChannelId
    if (channelCode && !inviteChannelId) {
      const channel = await strapi.db.query(CHANNEL_UID).findOne({
        where: { code: channelCode },
      });
      if (channel) inviteChannelId = channel.id;
    }

    const inviteCode = externalInviteCode || await this.generateUniqueCode();

    let invitedBy: number | null = null;
    let inviteMethod: "invite_code" | "organic" = "organic";
    let inviteChannel: number | null = inviteChannelId || null;
    let distributionPath = `/${userId}/`;
    let distributionDepth = 0;

    if (inviterCode) {
      // 查找邀请人
      const inviterInvite = await strapi.db.query(USER_INVITE_UID).findOne({
        where: { inviteCode: inviterCode },
      });

      if (inviterInvite) {
        invitedBy = typeof inviterInvite.user === "object"
          ? inviterInvite.user.id
          : inviterInvite.user;
        inviteMethod = "invite_code";
        inviteChannel = inviterInvite.inviteChannel
          ? (typeof inviterInvite.inviteChannel === "object"
              ? inviterInvite.inviteChannel.id
              : inviterInvite.inviteChannel)
          : null;

        // 检查是否超过 3 级分销链
        if ((inviterInvite.distributionDepth || 0) < MAX_DISTRIBUTION_DEPTH) {
          // 未超限，追加到上级路径
          const parentPath = inviterInvite.distributionPath || "/";
          distributionPath = buildPath(parentPath, userId);
          distributionDepth = (inviterInvite.distributionDepth || 0) + 1;
        } else {
          // 超过 3 级，重置为新的链根（邀请人仍保留，但分销链另起）
          distributionPath = `/${userId}/`;
          distributionDepth = 0;
        }
      }
    }

    // 查找用户的当前渠道作为兜底
    if (!inviteChannel) {
      const currentMember = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
        where: { user: userId, isCurrent: true },
        populate: ["channel"],
      });
      if (currentMember?.channel) {
        inviteChannel = typeof currentMember.channel === "object"
          ? currentMember.channel.id
          : currentMember.channel;
      }
    }

    // 如果仍没有渠道信息，查找邀请人的当前渠道
    if (!inviteChannel && invitedBy) {
      const inviterMember = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
        where: { user: invitedBy, isCurrent: true },
        populate: ["channel"],
      });
      if (inviterMember?.channel) {
        inviteChannel = typeof inviterMember.channel === "object"
          ? inviterMember.channel.id
          : inviterMember.channel;
      }
    }

    const existing = await strapi.db.query(USER_INVITE_UID).findOne({
      where: { user: userId },
    });

    if (existing) {
      if (inviterCode && inviteMethod === "invite_code") {
        await strapi.db.query(USER_INVITE_UID).delete({
          where: { id: existing.id },
        });
      } else if (existing.inviteCode) {
        return existing;
      } else {
        await strapi.db.query(USER_INVITE_UID).update({
          where: { id: existing.id },
          data: { inviteCode },
        });
        return strapi.db.query(USER_INVITE_UID).findOne({
          where: { id: existing.id },
          populate: ["user", "invitedBy", "inviteChannel"],
        });
      }
    }

    const record = await strapi.db.query(USER_INVITE_UID).create({
      data: {
        user: userId,
        inviteCode,
        invitedBy,
        inviteChannel,
        inviteMethod,
        distributionPath,
        distributionDepth,
      },
    });

    return strapi.db.query(USER_INVITE_UID).findOne({
      where: { id: record.id },
      populate: ["user", "invitedBy", "inviteChannel"],
    });
  },

  /**
   * 格式化邀请信息为 API 响应格式
   */
  formatInviteInfo(inviteInfo: any) {
    if (!inviteInfo) return null;
    return {
      myInviteCode: inviteInfo.inviteCode,
      invitedBy: inviteInfo.invitedBy
        ? typeof inviteInfo.invitedBy === "object" ? { id: inviteInfo.invitedBy.id } : { id: inviteInfo.invitedBy }
        : null,
      inviteMethod: inviteInfo.inviteMethod,
      distributionDepth: inviteInfo.distributionDepth,
      boundChannel: inviteInfo.inviteChannel
        ? typeof inviteInfo.inviteChannel === "object" ? { id: inviteInfo.inviteChannel.id, name: inviteInfo.inviteChannel.name } : null
        : null,
    };
  },

  /**
   * 根据 inviteCode 查找用户
   */
  async findByInviteCode(code: string) {
    return strapi.db.query(USER_INVITE_UID).findOne({
      where: { inviteCode: code },
      populate: ["user", "invitedBy", "inviteChannel"],
    });
  },

  /**
   * 根据用户 ID 查找 user-invite 记录
   */
  async findByUserId(userId: number) {
    return strapi.db.query(USER_INVITE_UID).findOne({
      where: { user: userId },
      populate: ["user", "invitedBy", "inviteChannel"],
    });
  },

  /**
   * 获取用户的分销链（从自身向上 3 级）
   * 返回 [root, ... , self] 按深度升序排列
   */
  async getDistributionChain(userId: number) {
    const invite = await strapi.db.query(USER_INVITE_UID).findOne({
      where: { user: userId },
      populate: ["user", "invitedBy", "inviteChannel"],
    });

    if (!invite || !invite.distributionPath) return [];

    const userIds = parsePathIds(invite.distributionPath);

    const users = await strapi.db.query(USER_UID).findMany({
      where: { id: { $in: userIds } },
      select: ["id", "username", "email"],
    });

    const userMap = new Map(users.map((u: any) => [u.id, u]));

    return userIds.map((id, index) => ({
      id,
      username: userMap.get(id)?.username || null,
      email: userMap.get(id)?.email || null,
      depth: index,
    }));
  },

  /**
   * 查询用户的下级分销用户列表（直接下级）
   */
  async getDirectDownstream(userId: number) {
    const invites = await strapi.db.query(USER_INVITE_UID).findMany({
      where: { invitedBy: userId },
      populate: ["user", "inviteChannel"],
    });

    return invites.map((inv: any) => ({
      userId: inv.user?.id,
      username: inv.user?.username,
      email: inv.user?.email,
      inviteCode: inv.inviteCode,
      inviteMethod: inv.inviteMethod,
      distributionDepth: inv.distributionDepth,
      boundChannel: inv.inviteChannel
        ? { id: inv.inviteChannel.id, name: inv.inviteChannel.name }
        : null,
      createdAt: inv.createdAt,
    }));
  },

  /**
   * 查询用户的所有下级分销（递归，通过 distributionPath 前缀匹配）
   */
  async getAllDownstream(userId: number) {
    const invite = await strapi.db.query(USER_INVITE_UID).findOne({
      where: { user: userId },
    });

    if (!invite || !invite.distributionPath) return [];

    const prefix = invite.distributionPath.endsWith("/")
      ? invite.distributionPath
      : `${invite.distributionPath}/`;

    const downstream = await strapi.db.query(USER_INVITE_UID).findMany({
      where: {
        $and: [
          { distributionPath: { $startsWith: prefix } },
          { id: { $ne: invite.id } },
        ],
      },
      populate: ["user", "inviteChannel"],
    });

    return downstream.map((inv: any) => ({
      userId: inv.user?.id,
      username: inv.user?.username,
      email: inv.user?.email,
      depth: inv.distributionDepth,
      boundChannel: inv.inviteChannel
        ? { id: inv.inviteChannel.id, name: inv.inviteChannel.name }
        : null,
      createdAt: inv.createdAt,
    }));
  },

  /**
   * 获取用户的分销统计
   */
  async getUserDistributionStats(userId: number) {
    const invite = await strapi.db.query(USER_INVITE_UID).findOne({
      where: { user: userId },
      populate: ["inviteChannel"],
    });

    if (!invite) return null;

    const chain = await this.getDistributionChain(userId);
    const directDownstream = await this.getDirectDownstream(userId);
    const allDownstream = await this.getAllDownstream(userId);

    return {
      userId,
      inviteCode: invite.inviteCode,
      inviteMethod: invite.inviteMethod,
      distributionDepth: invite.distributionDepth,
      distributionChain: chain,
      boundChannel: invite.inviteChannel
        ? { id: invite.inviteChannel.id, name: invite.inviteChannel.name }
        : null,
      stats: {
        directCount: directDownstream.length,
        totalDownstreamCount: allDownstream.length,
        maxDepth: chain.length > 0 ? chain.length - 1 : 0,
      },
    };
  },

  /**
   * 简单 CRUD 方法（管理端用）
   */
  async find(query: any = {}) {
    const { page = 1, pageSize = 20, ...filters } = query;
    const results = await strapi.db.query(USER_INVITE_UID).findMany({
      where: filters,
      offset: (page - 1) * pageSize,
      limit: pageSize,
      populate: ["user", "inviteChannel"],
    });
    const total = await strapi.db.query(USER_INVITE_UID).count({ where: filters });
    return {
      data: results,
      pagination: { page: Number(page), pageSize: Number(pageSize), total, pageCount: Math.ceil(total / pageSize) },
    };
  },

  async findOne(id: number) {
    return strapi.db.query(USER_INVITE_UID).findOne({ where: { id }, populate: ["user", "inviteChannel"] });
  },

  async create(data: any) {
    return strapi.db.query(USER_INVITE_UID).create({ data });
  },

  async update(id: number, data: any) {
    return strapi.db.query(USER_INVITE_UID).update({ where: { id }, data });
  },

  async delete(id: number) {
    return strapi.db.query(USER_INVITE_UID).delete({ where: { id } });
  },

  /**
   * 使用邀请码（C 端入口）
   * 1. 校验邀请码有效性
   * 2. 创建渠道成员（非当前渠道）
   * 3. 授权关联渠道
   * 4. 更新邀请状态为 used
   */
  async useInvite(code: string, usedByUserId: number) {
    const invite = await strapi.db.query(USER_INVITE_UID).findOne({
      where: { code, status: "active" },
      populate: ["user", "inviteChannel"],
    });

    if (!invite) {
      throw new Error(`邀请码无效或已过期: ${code}`);
    }

    const channelMemberService = strapi.plugin("zhao-channel").service("channel-member");

    // 复用 channel-member.useInvitationCode 完成渠道成员创建 + 授权
    const member = await (channelMemberService as any).useInvitationCode(
      usedByUserId,
      code
    );

    // 更新邀请状态
    await strapi.db.query(USER_INVITE_UID).update({
      where: { id: invite.id },
      data: { status: "used" },
    });

    return member;
  },

  /**
   * 获取渠道维度的分销统计（用于替换 channel.getDistributionStats）
   */
  async getChannelDistributionStats(channelId: number) {
    const invites = await strapi.db.query(USER_INVITE_UID).findMany({
      where: { inviteChannel: channelId },
      populate: ["user"],
    });

    // 通过 path 获取所有子渠道关联的用户数
    const channel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id: channelId },
    });

    let subChannelCustomerCount = 0;
    if (channel?.path && channel.path !== "/") {
      const { getDescendantIdsByPath } = await import("../utils/path");
      const descendantIds = await getDescendantIdsByPath(strapi, channel.path, true);

      if (descendantIds.length > 0) {
        const subInvites = await strapi.db.query(USER_INVITE_UID).count({
          where: { inviteChannel: { $in: descendantIds } },
        });
        subChannelCustomerCount = Number(subInvites);
      }
    }

    return {
      channelId,
      directCustomerCount: invites.length,
      subChannelCustomerCount,
      totalCustomerCount: invites.length + subChannelCustomerCount,
    };
  },
});