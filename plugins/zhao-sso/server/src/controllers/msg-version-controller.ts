import type { Core } from "@strapi/strapi";

const VERSION_UID = "plugin::zhao-sso.msg-template-version";
const TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const JOB_UID = "plugin::zhao-sso.msg-job";
const VISIT_LOG_UID = "plugin::zhao-website.visit-log";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  async function wrap(ctx: any, fn: () => Promise<any>) {
    try {
      ctx.body = await fn();
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message, code: (e as any).code || null };
    }
  }

  /** 解析模板（documentId 或数字 id → 数字 id） */
  async function resolveTemplate(templateId: string): Promise<number> {
    const num = Number(templateId);
    if (Number.isInteger(num) && num > 0) {
      const t = await strapi.db.query(TEMPLATE_UID).findOne({ where: { id: num } });
      if (t) return t.id;
    }
    const t = await strapi.db.query(TEMPLATE_UID).findOne({ where: { documentId: templateId } });
    if (!t) {
      const e: any = new Error("模板不存在");
      e.status = 404;
      throw e;
    }
    return t.id;
  }

  return {
    async list(ctx: any) {
      await wrap(ctx, async () => {
        const templateId = await resolveTemplate(ctx.params.templateId);
        const rows = await strapi.db.query(VERSION_UID).findMany({
          where: { template: templateId },
          orderBy: { id: "DESC" },
        });
        // 点击数实时聚合（utm_source=msg, utm_campaign=code）
        const clicks: Record<string, number> = {};
        for (const r of rows) {
          if (!r.code) continue;
          const c = await strapi.db
            .query(VISIT_LOG_UID)
            .count({ where: { utmSource: "msg", utmCampaign: r.code } })
            .catch(() => 0);
          clicks[r.code] = c;
        }
        return { data: rows.map((r: any) => ({ ...r, clickCountLive: clicks[r.code] || 0 })) };
      });
    },

    async create(ctx: any) {
      await wrap(ctx, async () => {
        const templateId = await resolveTemplate(ctx.params.templateId);
        const data = ctx.request?.body || {};
        const row = await strapi.db.query(VERSION_UID).create({
          data: { ...data, template: templateId, sentCount: 0, successCount: 0, clickCount: 0 },
        });
        return { data: row };
      });
    },

    async update(ctx: any) {
      await wrap(ctx, async () => {
        const row = await strapi.db.query(VERSION_UID).update({
          where: { id: Number(ctx.params.id) },
          data: ctx.request?.body || {},
        });
        return { data: row };
      });
    },

    async delete(ctx: any) {
      await wrap(ctx, async () => {
        const id = Number(ctx.params.id);
        const used = await strapi.db.query(JOB_UID).count({ where: { version: id } });
        if (used > 0) {
          const e: any = new Error(`该版本已被 ${used} 个消息任务引用，无法删除`);
          e.status = 400;
          throw e;
        }
        await strapi.db.query(VERSION_UID).delete({ where: { id } });
        return { data: { id } };
      });
    },

    async activate(ctx: any) {
      await wrap(ctx, async () => {
        const id = Number(ctx.params.id);
        const row = await strapi.db.query(VERSION_UID).findOne({ where: { id } });
        if (!row) {
          const e: any = new Error("版本不存在");
          e.status = 404;
          throw e;
        }
        await strapi.db
          .query(VERSION_UID)
          .updateMany({ where: { template: row.template }, data: { status: "draft" } });
        await strapi.db.query(VERSION_UID).update({ where: { id }, data: { status: "active" } });
        return { data: await strapi.db.query(VERSION_UID).findOne({ where: { id } }) };
      });
    },

    async abStats(ctx: any) {
      await wrap(ctx, async () => {
        const templateId = await resolveTemplate(ctx.params.templateId);
        const rows = await strapi.db.query(VERSION_UID).findMany({
          where: { template: templateId },
          orderBy: { id: "ASC" },
        });
        const out = [];
        for (const r of rows) {
          const click = await strapi.db
            .query(VISIT_LOG_UID)
            .count({ where: { utmSource: "msg", utmCampaign: r.code } })
            .catch(() => 0);
          const sent = r.sentCount || 0;
          out.push({
            ...r,
            clickCountLive: click,
            clickRate: sent ? Math.round((click / sent) * 1000) / 10 : 0,
            successRate: sent ? Math.round(((r.successCount || 0) / sent) * 1000) / 10 : 0,
          });
        }
        return { data: out };
      });
    },
  };
};
