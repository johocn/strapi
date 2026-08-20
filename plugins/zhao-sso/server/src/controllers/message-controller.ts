import type { Core } from "@strapi/strapi";

const TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const JOB_UID = "plugin::zhao-sso.msg-job";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.plugin("zhao-sso").service("sso-msg");

  async function wrap(ctx: any, fn: () => Promise<any>) {
    try {
      ctx.body = await fn();
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message, code: (e as any).code || null };
    }
  }

  return {
    // ===== 消息模板 CRUD =====
    async listTemplates(ctx: any) {
      await wrap(ctx, async () => {
        const { page = 1, pageSize = 20, ...filters } = ctx.query;
        const pageNum = Number(page);
        const pageSizeNum = Number(pageSize);
        const results = await strapi.documents(TEMPLATE_UID).findMany({
          filters,
          sort: { createdAt: "desc" },
          limit: pageSizeNum,
          start: (pageNum - 1) * pageSizeNum,
        });
        const total = await strapi.db.query(TEMPLATE_UID).count({ where: filters });
        return { data: results, meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } } };
      });
    },

    async getTemplate(ctx: any) {
      await wrap(ctx, async () => {
        const result = await strapi.documents(TEMPLATE_UID).findOne({ documentId: ctx.params.id });
        if (!result) throw { status: 404, message: "模板不存在" };
        return { data: result };
      });
    },

    async createTemplate(ctx: any) {
      await wrap(ctx, async () => {
        const result = await strapi.documents(TEMPLATE_UID).create({ data: ctx.request.body });
        return { data: result };
      });
    },

    async updateTemplate(ctx: any) {
      await wrap(ctx, async () => {
        const result = await strapi.documents(TEMPLATE_UID).update({
          documentId: ctx.params.id,
          data: ctx.request.body,
        });
        return { data: result };
      });
    },

    async deleteTemplate(ctx: any) {
      await wrap(ctx, async () => {
        const result = await strapi.documents(TEMPLATE_UID).delete({ documentId: ctx.params.id });
        return { data: result };
      });
    },

    // ===== 消息任务 =====
    async listJobs(ctx: any) {
      await wrap(ctx, async () => {
        const { page = 1, pageSize = 20, ...rest } = ctx.query;
        const pageNum = Number(page);
        const pageSizeNum = Number(pageSize);
        // 组装过滤：支持 status/scene/provider，关系字段 complexity 简化
        const filters: Record<string, any> = {};
        for (const k of ["status", "scene", "provider"]) {
          if (rest[k]) filters[k] = rest[k];
        }
        const results = await strapi.documents(JOB_UID).findMany({
          filters,
          populate: ["template", "user", "version"],
          sort: { createdAt: "desc" },
          limit: pageSizeNum,
          start: (pageNum - 1) * pageSizeNum,
        });
        const total = await strapi.db.query(JOB_UID).count({ where: filters });
        return { data: results, meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } } };
      });
    },

    async getJob(ctx: any) {
      await wrap(ctx, async () => {
        const result = await strapi.documents(JOB_UID).findOne({
          documentId: ctx.params.id,
          populate: ["template", "user", "version"],
        });
        if (!result) throw { status: 404, message: "任务不存在" };
        return { data: result };
      });
    },

    /** 手动单发：立即 buildJob + sendJob */
    async sendNow(ctx: any) {
      await wrap(ctx, async () => {
        const { userId, templateCode, params, link, scene } = ctx.request.body;
        const job = await svc().sendNow({
          user: userId,
          scene: scene || "manual",
          templateCode,
          params,
          link,
        });
        return { data: job };
      });
    },

    /** 批量发送：按用户 id 列表 or 筛选，逐个 buildJob+sendJob */
    async sendBatch(ctx: any) {
      await wrap(ctx, async () => {
        const { userIds = [], templateCode, params, link, scene, userId } = ctx.request.body;
        const ids = Array.isArray(userIds) && userIds.length ? userIds : userId ? [userId] : [];
        if (!ids.length) throw { status: 400, message: "未指定目标用户" };
        const results = [];
        for (const uid of ids) {
          results.push(
            await svc().sendNow({ user: uid, scene: scene || "batch", templateCode, params, link })
          );
        }
        return { data: results };
      });
    },

    /** 失败重试 */
    async retryJob(ctx: any) {
      await wrap(ctx, async () => {
        const { retryCount } = await strapi.db.query(JOB_UID).findOne({
          where: { id: ctx.params.id },
          select: ["retryCount"],
        });
        if (retryCount !== undefined && retryCount >= 3) {
          throw { status: 400, message: "重试次数已达上限" };
        }
        const job = await svc().sendJob(ctx.params.id);
        return { data: job };
      });
    },

    /** 查询/刷新用户公众号关注状态 */
    async refreshSubscribe(ctx: any) {
      await wrap(ctx, async () => {
        const subscribe = await svc().refreshSubscribe(Number(ctx.params.id));
        return { data: { userId: Number(ctx.params.id), subscribe } };
      });
    },
  };
};