import type { Core } from "@strapi/strapi";
import bcrypt from "bcryptjs";

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

    /** 从模板库添加公共模板到公众号，并解析字段名返回给前端回填 */
    async addFromLibrary(ctx: any) {
      await wrap(ctx, async () => {
        const wx = strapi.plugin("zhao-sso").service("sso-wx-menu");
        const { templateIdShort, keywordNameList } = ctx.request.body || {};
        const added = await wx.addFromLibrary({ templateIdShort, keywordNameList });
        const list: any = await wx.listTemplates();
        const found = (list.template_list || []).find((t: any) => t.template_id === added.template_id);
        const content = (found && found.content) || "";
        const re = /\{\{(\w+)\.DATA\}\}/g;
        const fields: string[] = [];
        let mm: RegExpExecArray | null;
        while ((mm = re.exec(content))) fields.push(mm[1]);
        return { data: { templateId: added.template_id, title: (found && found.title) || "", content, fields: Array.from(new Set(fields)) } };
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

    /** 服务间单发（app_code+app_secret 鉴权）：供 Vendure 等业务后端调用，触达目标由 SSO 按绑定表解析 openid */
    async apiSend(ctx: any) {
      await wrap(ctx, async () => {
        const { app_code, app_secret, sso_user_id, template_code, params, link, scene, dedupe_key } =
          ctx.request.body;
        if (!app_code || !app_secret || !sso_user_id || !template_code) {
          throw { status: 400, message: "app_code, app_secret, sso_user_id, template_code 必填" };
        }
        const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
        const app = await oauthService.findApp(app_code);
        if (!app || !app.is_active) throw { status: 404, message: "应用不存在或已禁用" };
        if (!bcrypt.compareSync(app_secret, app.app_secret)) throw { status: 401, message: "app_secret 验证失败" };
        const user = await strapi.plugin("zhao-sso").service("sso-user").findById(Number(sso_user_id));
        if (!user) throw { status: 404, message: "SSO 用户不存在" };
        const job = await svc().sendNow({
          user: Number(sso_user_id),
          scene: scene || "api",
          templateCode: template_code,
          params: params || {},
          link,
          dedupeKey: dedupe_key,
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