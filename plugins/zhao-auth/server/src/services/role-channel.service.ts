import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-auth.role-channel";
const CHANNEL_UID = "plugin::zhao-channel.channel";
const USER_UID = "plugin::users-permissions.user";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 角色渠道列表（分页）
   */
  async listRoleChannels(page = 1, pageSize = 20, filters: any = {}) {
    const where: any = {};
    if (filters.role) where.role = { $contains: filters.role };

    const records = await strapi.db.query(UID).findMany({
      where,
      populate: { channel: true, grantedBy: true },
      orderBy: { id: "asc" },
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    const total = await strapi.db.query(UID).count({ where });

    const list = records.map((r: any) => ({
      id: r.id,
      role: r.role,
      channel: r.channel
        ? { id: r.channel.id, name: r.channel.name, code: r.channel.code }
        : null,
      grantedBy: r.grantedBy
        ? { id: r.grantedBy.id, username: r.grantedBy.username }
        : null,
      createdAt: r.createdAt,
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
   * 查询角色被授权的所有渠道 ID
   */
  async getRoleChannelIds(roles: string[]) {
    if (!roles || roles.length === 0) return [];

    const records = await strapi.db.query(UID).findMany({
      where: { role: { $in: roles } },
      populate: { channel: true },
    });

    const channelIds = new Set<number>();
    for (const r of records) {
      if (r.channel?.id) channelIds.add(r.channel.id);
    }
    return Array.from(channelIds);
  },

  /**
   * 授权角色渠道（单个）
   */
  async grant(data: { role: string; channelId: number; grantedBy?: number }) {
    const role = data.role.trim();
    if (!role) {
      const e: any = new Error("角色名不能为空");
      e.status = 400;
      throw e;
    }

    // 检查渠道是否存在
    const channel: any = await strapi.db.query(CHANNEL_UID).findOne({
      where: { id: data.channelId },
    });
    if (!channel) {
      const e: any = new Error("渠道不存在");
      e.status = 404;
      throw e;
    }

    // 检查是否已存在
    const existing: any = await strapi.db.query(UID).findOne({
      where: { role, channel: { id: data.channelId } },
    });
    if (existing) {
      return {
        id: existing.id,
        role: existing.role,
        channel: { id: data.channelId, name: channel.name, code: channel.code },
      };
    }

    const created: any = await strapi.db.query(UID).create({
      data: {
        role,
        channel: data.channelId,
        grantedBy: data.grantedBy || null,
      },
      populate: { channel: true, grantedBy: true },
    });

    return {
      id: created.id,
      role: created.role,
      channel: created.channel
        ? { id: created.channel.id, name: created.channel.name, code: created.channel.code }
        : null,
      grantedBy: created.grantedBy
        ? { id: created.grantedBy.id, username: created.grantedBy.username }
        : null,
      createdAt: created.createdAt,
    };
  },

  /**
   * 批量授权
   */
  async batchGrant(data: { role: string; channelIds: number[]; grantedBy?: number }) {
    const role = data.role.trim();
    if (!role) {
      const e: any = new Error("角色名不能为空");
      e.status = 400;
      throw e;
    }
    if (!data.channelIds || data.channelIds.length === 0) {
      const e: any = new Error("channelIds 不能为空");
      e.status = 400;
      throw e;
    }

    const results = [];
    for (const channelId of data.channelIds) {
      try {
        const r = await this.grant({
          role,
          channelId,
          grantedBy: data.grantedBy,
        });
        results.push({ success: true, channelId, result: r });
      } catch (err: any) {
        results.push({ success: false, channelId, error: err.message });
      }
    }
    return { results };
  },

  /**
   * 撤销角色渠道
   */
  async revoke(id: number) {
    const existing: any = await strapi.db.query(UID).findOne({
      where: { id },
    });
    if (!existing) {
      const e: any = new Error("记录不存在");
      e.status = 404;
      throw e;
    }

    await strapi.db.query(UID).delete({ where: { id } });
    return { success: true, id, role: existing.role };
  },

  /**
   * 按角色名删除
   */
  async revokeByRole(role: string) {
    const records = await strapi.db.query(UID).findMany({
      where: { role },
    });
    for (const r of records) {
      await strapi.db.query(UID).delete({ where: { id: r.id } });
    }
    return { success: true, role, deleted: records.length };
  },
});
