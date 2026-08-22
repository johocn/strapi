import type { Core } from "@strapi/strapi";

const JOB_UID = "plugin::zhao-sso.msg-job";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    /**
     * 我的站内信：读 provider=inapp && status=sent 的消息（按 sso-user 归属）
     * ?page&pageSize&unreadOnly  => { data: { list, unreadCount }, meta }
     */
    async myNotices(ctx: any) {
      try {
        const ssoUserId = Number(ctx.state.user?.id || ctx.state.user?.documentId);
        const { page = "1", pageSize = "20", unreadOnly } = ctx.query;
        const pageNum = parseInt(page, 10);
        const pageSizeNum = parseInt(pageSize, 10);
        const where: any = {
          provider: "inapp",
          status: "sent",
          user: ssoUserId,
        };
        if (unreadOnly === "true" || unreadOnly === "1") where.readAt = { $null: true };
        const [total, unreadCount] = await Promise.all([
          strapi.db.query(JOB_UID).count({ where }),
          strapi.db.query(JOB_UID).count({ where: { ...where, readAt: { $null: true } } }),
        ]);
        const rows = await strapi.db.query(JOB_UID).findMany({
          where,
          orderBy: { sentAt: "desc" },
          offset: (pageNum - 1) * pageSizeNum,
          limit: pageSizeNum,
        });
        ctx.body = {
          data: {
            list: rows,
            unreadCount,
          },
          meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } },
        };
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },

    /** 标记站内信已读（幂等，仅属主可操作） */
    async read(ctx: any) {
      try {
        const ssoUserId = Number(ctx.state.user?.id || ctx.state.user?.documentId);
        const jobId = parseInt(ctx.params.id, 10);
        const job = await strapi.db.query(JOB_UID).findOne({ where: { id: jobId } });
        if (!job) { ctx.status = 404; ctx.body = { error: "消息不存在" }; return; }
        if ((job.user?.id ?? job.user) !== ssoUserId) { ctx.status = 403; ctx.body = { error: "无权操作" }; return; }
        if (!job.readAt) {
          await strapi.db.query(JOB_UID).update({ where: { id: jobId }, data: { readAt: new Date() } });
        }
        ctx.body = { data: { ok: true } };
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },
  };
};