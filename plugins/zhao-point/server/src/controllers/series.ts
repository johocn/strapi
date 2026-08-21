import type { Core } from "@strapi/strapi";

const SERIES_UID = "plugin::zhao-point.activity-series";
const ACTIVITY_UID = "plugin::zhao-point.activity";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const wrapList = (result: any) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.plugin("zhao-point").service("series-service");

  return ({
    // ===== 公开 =====

    // GET /series
    async list(ctx: any) {
      try {
        const result = await strapi.documents(SERIES_UID).findMany({
          filters: { status: "active" },
          sort: "sortOrder:asc",
          populate: "*",
        });
        for (const s of result) {
          s.sessionCount = await strapi.db.query(ACTIVITY_UID).count({
            where: { belongsToSeries: s.id, status: { $in: ["signup_open", "ongoing"] } },
          });
        }
        ctx.body = wrapList(result);
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },

    // GET /series/:documentId
    async detail(ctx: any) {
      try {
        const docId = ctx.params.documentId;
        const series = await svc().findOne(docId);
        if (!series || series.status !== "active") { ctx.status = 404; ctx.body = { error: "系列不存在" }; return; }
        if (series.schedule) {
          await svc().generateSchedule(docId);
        }
        const acts = await svc().listActivities(docId);
        ctx.body = wrap({ ...series, activities: acts || [] });
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },

    // ===== 管理员 =====

    // GET /adm/series
    async adminList(ctx: any) {
      try {
        ctx.body = wrapList(await svc().find({ populate: "*" }));
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },

    // GET /adm/series/:documentId
    async adminFindOne(ctx: any) {
      try {
        ctx.body = wrap(await svc().findOne(ctx.params.documentId));
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },

    // POST /adm/series
    async adminCreate(ctx: any) {
      try {
        const body = ctx.request.body?.data || ctx.request.body;
        ctx.body = wrap(await svc().create(body));
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },

    // PUT /adm/series/:documentId
    async adminUpdate(ctx: any) {
      try {
        const body = ctx.request.body?.data || ctx.request.body;
        ctx.body = wrap(await svc().update(ctx.params.documentId, body));
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },

    // DELETE /adm/series/:documentId
    async adminDelete(ctx: any) {
      try {
        await svc().delete(ctx.params.documentId);
        ctx.body = wrap({ ok: true });
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },

    // GET /adm/series/:documentId/activities
    async adminActivities(ctx: any) {
      try {
        const series = await svc().findOne(ctx.params.documentId);
        if (!series) { ctx.status = 404; ctx.body = { error: "系列不存在" }; return; }
        const rows = await strapi.db.query(ACTIVITY_UID).findMany({
          where: { belongsToSeries: series.id },
          orderBy: { startTime: "asc" },
        });
        ctx.body = wrapList(rows);
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },

    // POST /adm/activities/:activityDocumentId/duplicate
    async adminDuplicateActivity(ctx: any) {
      try {
        ctx.body = wrap(await svc().duplicate(ctx.params.activityDocumentId));
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },

    // POST /adm/series/:documentId/generate
    async adminGenerate(ctx: any) {
      try {
        const count = ctx.query.count ? parseInt(ctx.query.count, 10) : undefined;
        ctx.body = wrap(await svc().generateSchedule(ctx.params.documentId, { count }));
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },
  });
};