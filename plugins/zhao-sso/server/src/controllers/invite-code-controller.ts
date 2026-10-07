import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-sso.sso-invite-code";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // 邀请漏斗聚合：每码「打开数（zhao-studio browser_logs, eventType=invite-view）
  // → 注册数（sso_invite_usages）」+ 转化率；appCode 过滤区分来源应用
  async funnel(ctx: any) {
    try {
      const { appCode } = ctx.query;
      const codeWhere: Record<string, unknown> = {};
      if (appCode) codeWhere.app_code = appCode;
      const codes = await strapi.db.query(UID).findMany({
        where: codeWhere,
        select: ["id", "code", "app_code"],
      });
      const codeIds = codes.map((c: any) => c.id);

      const logWhere: Record<string, unknown> = { eventType: "invite-view" };
      if (appCode) logWhere.appCode = appCode;
      const logs = await strapi.db
        .query("plugin::zhao-studio.browser-log")
        .findMany({ where: logWhere, select: ["inviteCode", "createdAt"] });

      const usageWhere: Record<string, unknown> = {};
      if (codeIds.length > 0) usageWhere.invite_code = { id: { $in: codeIds } };
      const usages = await strapi.db
        .query("plugin::zhao-sso.sso-invite-usage")
        .findMany({
          where: usageWhere,
          select: ["app_code"],
          populate: { invite_code: { select: ["code"] } },
        });

      // 打开数按码聚合（关联日志 inviteCode 字符串）
      const openMap = new Map<string, number>();
      let lastOpenAt: string | null = null;
      for (const log of logs) {
        if (!log.inviteCode) continue;
        openMap.set(log.inviteCode, (openMap.get(log.inviteCode) || 0) + 1);
        if (!lastOpenAt || new Date(log.createdAt) > new Date(lastOpenAt)) {
          lastOpenAt = log.createdAt;
        }
      }
      // 注册数按码聚合
      const regMap = new Map<string, number>();
      for (const u of usages) {
        const code = u.invite_code?.code;
        if (code) regMap.set(code, (regMap.get(code) || 0) + 1);
      }

      const rows = codes
        .map((c: any) => {
          const opens = openMap.get(c.code) || 0;
          const registers = regMap.get(c.code) || 0;
          return {
            code: c.code,
            appCode: c.app_code,
            opens,
            registers,
            conversionRate: opens > 0 ? Number(((registers / opens) * 100).toFixed(1)) : null,
          };
        })
        .sort((a: any, b: any) => b.opens - a.opens || b.registers - a.registers);

      const totalOpens = rows.reduce((s: number, r: any) => s + r.opens, 0);
      const totalRegisters = rows.reduce((s: number, r: any) => s + r.registers, 0);
      ctx.body = {
        data: {
          summary: {
            totalOpens,
            totalRegisters,
            conversionRate:
              totalOpens > 0 ? Number(((totalRegisters / totalOpens) * 100).toFixed(1)) : null,
            lastOpenAt,
          },
          rows,
        },
      };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
  async list(ctx: any) {
    try {
      const { page = 1, pageSize = 20, ...filters } = ctx.query;
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const results = await strapi.documents(UID).findMany({
        filters,
        populate: "*",
        sort: { createdAt: "desc" },
        limit: pageSizeNum,
        start: (pageNum - 1) * pageSizeNum,
      });
      const total = await strapi.db.query(UID).count({ where: filters });
      ctx.body = {
        data: results,
        meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } },
      };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async create(ctx: any) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.documents(UID).create({ data, populate: "*" });
      ctx.body = { data: result };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async delete(ctx: any) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID).delete({ documentId: id });
      ctx.body = { data: result };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async validate(ctx: any) {
    try {
      const { id } = ctx.params;
      const code = await strapi.documents(UID).findOne({ documentId: id });
      if (!code) {
        ctx.body = { valid: false, reason: "邀请码不存在" };
        return;
      }
      if (!code.is_active) {
        ctx.body = { valid: false, reason: "邀请码未启用" };
        return;
      }
      const now = new Date();
      if (code.valid_from && new Date(code.valid_from) > now) {
        ctx.body = { valid: false, reason: "邀请码尚未生效" };
        return;
      }
      if (code.valid_until && new Date(code.valid_until) < now) {
        ctx.body = { valid: false, reason: "邀请码已过期" };
        return;
      }
      if (code.max_uses != null && code.use_count >= code.max_uses) {
        ctx.body = { valid: false, reason: "邀请码已达使用上限" };
        return;
      }
      ctx.body = { valid: true };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
});
