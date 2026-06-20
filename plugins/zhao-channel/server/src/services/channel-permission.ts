import type { Core } from "@strapi/strapi";
import {
  setUserChannelCache,
  setRoleChannelCache,
  deleteUserAllChannelsCache,
  deleteUserChannelCache,
  deleteRoleChannelCache,
} from "../utils/redis";
import { addBatchGrantJob } from "../utils/queue";
import { getDescendantIdsByPath } from "../utils/path";

const USER_CHANNEL_UID = "plugin::zhao-channel.user-channel";
const ROLE_CHANNEL_UID = "plugin::zhao-auth.role-channel";
const CHANNEL_MEMBER_UID = "plugin::zhao-channel.channel-member";
const USER_UID = "plugin::users-permissions.user";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async grantChannelsToUser(userId: number, channelIds: number[], grantedBy: number) {
    const results = [];
    for (const channelId of channelIds) {
      const existing = await strapi.db.query(USER_CHANNEL_UID).findOne({
        where: { user: userId, channel: channelId },
      });
      if (!existing) {
        const result = await strapi.db.query(USER_CHANNEL_UID).create({
          data: { user: userId, channel: channelId, grantedBy },
        });
        results.push(result);
      }
    }

    const allUserChannels = await strapi.db.query(USER_CHANNEL_UID).findMany({
      where: { user: userId },
      populate: ["channel"],
    });
    const allChannelIds = allUserChannels.map((uc: any) =>
      uc.channel?.id || uc.channel
    );
    await setUserChannelCache(userId, allChannelIds);
    await deleteUserAllChannelsCache(userId);

    return { granted: results.length, channelIds };
  },

  async grantChannelsToRole(roleName: string, channelIds: number[], grantedBy: number) {
    const results = [];
    for (const channelId of channelIds) {
      const existing = await strapi.db.query(ROLE_CHANNEL_UID).findOne({
        where: { role: roleName, channel: channelId },
      });
      if (!existing) {
        const result = await strapi.db.query(ROLE_CHANNEL_UID).create({
          data: { role: roleName, channel: channelId, grantedBy },
        });
        results.push(result);
      }
    }

    const allRoleChannels = await strapi.db.query(ROLE_CHANNEL_UID).findMany({
      where: { role: roleName },
      populate: ["channel"],
    });
    const allChannelIds = allRoleChannels.map((rc: any) =>
      rc.channel?.id || rc.channel
    );
    await setRoleChannelCache(roleName, allChannelIds);

    const usersWithRole = await strapi.db.query(USER_UID).findMany({
      select: ["id", "zhaoRoles"],
    });
    for (const user of usersWithRole) {
      const roles = (user as any).zhaoRoles;
      if (Array.isArray(roles) && roles.includes(roleName)) {
        await deleteUserAllChannelsCache(user.id);
      }
    }

    return { granted: results.length, channelIds };
  },

  async batchGrantAsync(type: "user" | "role", targetId: number | string, channelIds: number[], grantedBy: number) {
    if (!channelIds || channelIds.length === 0) {
      return {
        jobId: `noop-${Date.now()}`,
        status: "completed",
        type,
        targetId,
        channelCount: 0,
      };
    }

    try {
      const job = await Promise.race([
        addBatchGrantJob({
          type,
          targetId,
          channelIds,
          grantedBy,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Queue timeout")), 5000)
        ),
      ]);
      return {
        jobId: job.id,
        status: "queued",
        type,
        targetId,
        channelCount: channelIds.length,
      };
    } catch {
      return {
        jobId: `local-${Date.now()}`,
        status: "pending",
        type,
        targetId,
        channelCount: channelIds.length,
      };
    }
  },

  async revokeChannelsFromUser(userId: number, channelIds: number[]) {
    let revoked = 0;
    for (const channelId of channelIds) {
      const deleted = await strapi.db.query(USER_CHANNEL_UID).delete({
        where: { user: userId, channel: channelId },
      });
      if (deleted) revoked++;
    }
    await deleteUserChannelCache(userId);
    await deleteUserAllChannelsCache(userId);
    return { revoked, channelIds };
  },

  async revokeChannelsFromRole(roleName: string, channelIds: number[]) {
    let revoked = 0;
    for (const channelId of channelIds) {
      const deleted = await strapi.db.query(ROLE_CHANNEL_UID).delete({
        where: { role: roleName, channel: channelId },
      });
      if (deleted) revoked++;
    }
    await deleteRoleChannelCache(roleName);

    const usersWithRole = await strapi.db.query(USER_UID).findMany({
      select: ["id", "zhaoRoles"],
    });
    for (const user of usersWithRole) {
      const roles = (user as any).zhaoRoles;
      if (Array.isArray(roles) && roles.includes(roleName)) {
        await deleteUserAllChannelsCache(user.id);
      }
    }

    return { revoked, channelIds };
  },

  async getUserChannels(userId: number) {
    const userChannels = await strapi.db.query(USER_CHANNEL_UID).findMany({
      where: { user: userId },
      populate: ["channel"],
    });
    return userChannels.map((uc: any) => ({
      id: uc.channel?.id || uc.channel,
      name: uc.channel?.name,
    }));
  },

  async getRoleChannels(roleName: string) {
    const roleChannels = await strapi.db.query(ROLE_CHANNEL_UID).findMany({
      where: { role: roleName },
      populate: ["channel"],
    });
    return roleChannels.map((rc: any) => ({
      id: rc.channel?.id || rc.channel,
      name: rc.channel?.name,
    }));
  },

  async getBatchGrantStatus(jobId: string) {
    try {
      const { getBatchGrantQueue } = await import("../utils/queue");
      const batchGrantQueue = getBatchGrantQueue();
      if (!batchGrantQueue) {
        return { jobId, status: "unavailable" };
      }
      const job = await Promise.race([
        batchGrantQueue.getJob(jobId),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      if (!job) {
        return { jobId, status: "not_found" };
      }
      const state = await job.getState();
      return {
        jobId: job.id,
        status: state,
        type: job.data.type,
        targetId: job.data.targetId,
        channelCount: job.data.channelIds?.length || 0,
        finishedPercent:
          state === "completed"
            ? 100
            : state === "failed"
            ? 0
            : undefined,
      };
    } catch {
      return { jobId, status: "unknown" };
    }
  },

  async getUserAllChannels(userId: number) {
    const { getUserAllChannelsCache, setUserAllChannelsCache } = await import("../utils/redis");

    const cached = await getUserAllChannelsCache(userId);
    if (cached) return cached;

    const channelIds = new Set<number>();

    const userChannels = await strapi.db.query(USER_CHANNEL_UID).findMany({
      where: { user: userId },
      populate: ["channel"],
    });
    for (const uc of userChannels) {
      if (uc.channel) {
        const cid = uc.channel.id || uc.channel;
        channelIds.add(cid);
        if (uc.channel.path) {
          const descendantIds = await getDescendantIdsByPath(strapi, uc.channel.path, false);
          descendantIds.forEach((id) => channelIds.add(id));
        }
      }
    }

    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
      select: ["id", "zhaoRoles"],
      populate: ["role"],
    });

    if (user) {
      let roleNames: string[] = [];
      const zhaoRoles = (user as any).zhaoRoles;
      if (Array.isArray(zhaoRoles) && zhaoRoles.length > 0) {
        roleNames = zhaoRoles.filter((r: any) => typeof r === "string");
      } else if ((user as any).role?.type) {
        roleNames = [(user as any).role.type];
      }

      if (roleNames.includes("admin")) {
        const allChannels = await strapi.db.query("plugin::zhao-channel.channel").findMany({
          select: ["id", "path"],
        });
        for (const ch of allChannels) {
          const cid = (ch as any).id;
          if (cid) channelIds.add(cid);
          if ((ch as any).path) {
            const descendantIds = await getDescendantIdsByPath(strapi, (ch as any).path, false);
            descendantIds.forEach((id) => channelIds.add(id));
          }
        }
      } else {
        for (const roleName of roleNames) {
          const roleChannels = await strapi.db.query(ROLE_CHANNEL_UID).findMany({
            where: { role: roleName },
            populate: ["channel"],
          });
          for (const rc of roleChannels) {
            if ((rc as any).channel) {
              const cid = (rc as any).channel.id || (rc as any).channel;
              channelIds.add(cid);
              if ((rc as any).channel.path) {
                const descendantIds = await getDescendantIdsByPath(strapi, (rc as any).channel.path, false);
                descendantIds.forEach((id) => channelIds.add(id));
              }
            }
          }
        }
      }
    }

    // 从 channel-member 获取当前渠道
    const currentMember = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
      where: { user: userId, isCurrent: true },
      populate: ["channel"],
    });
    if (currentMember?.channel) {
      const cid = currentMember.channel.id || currentMember.channel;
      channelIds.add(cid);
      if (currentMember.channel.path) {
        const descendantIds = await getDescendantIdsByPath(strapi, currentMember.channel.path, false);
        descendantIds.forEach((id) => channelIds.add(id));
      }
    }

    const result = Array.from(channelIds);
    await setUserAllChannelsCache(userId, result);
    return result;
  },

  /**
   * 角色等级映射
   */
  ROLE_LEVELS: { owner: 30, admin: 20, member: 10 } as Record<string, number>,

  /**
   * 检查用户是否有渠道访问权限
   */
  async checkUserChannelPermission(userId: number, channelId: number): Promise<boolean> {
    const allChannels = await this.getUserAllChannels(userId);
    return allChannels.includes(channelId);
  },

  /**
   * 获取用户在指定渠道的 channel-member 角色及等级值
   */
  async getChannelMemberRole(userId: number, channelId: number) {
    const member = await strapi.db.query(CHANNEL_MEMBER_UID).findOne({
      where: { user: userId, channel: channelId },
    });
    if (!member) return null;
    const levels = { owner: 30, admin: 20, member: 10 } as Record<string, number>;
    return {
      role: member.role as string,
      level: levels[member.role as string] || 0,
      isCurrent: member.isCurrent as boolean,
    };
  },

  /**
   * 检查用户角色是否达到指定等级
   */
  async checkChannelMemberRole(userId: number, channelId: number, minLevel: number): Promise<boolean> {
    const memberRole = await this.getChannelMemberRole(userId, channelId);
    if (!memberRole) return false;
    return memberRole.level >= minLevel;
  },
});
