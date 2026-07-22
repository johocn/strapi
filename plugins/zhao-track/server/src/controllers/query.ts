import type { Core } from "@strapi/strapi";

const wrapList = (result: any) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (Array.isArray(result)) return { data: result, meta: {} };
  return { data: result, meta: {} };
};

const CLICK_UID = "plugin::zhao-track.click-event";
const ORDER_UID = "plugin::zhao-track.order";
const SOURCE_TAG_UID = "plugin::zhao-track.source-tag";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getUserId = (ctx: any) => ctx.state.user?.id || ctx.state.user?.documentId;

  const buildWhere = (ctx: any, allowed: string[]) => {
    const where: any = {};
    for (const key of allowed) {
      if (ctx.query[key] !== undefined) where[key] = ctx.query[key];
    }
    if (ctx.query.startDate || ctx.query.endDate) {
      const field = ctx.query.dateField || "createdAt";
      where[field] = {};
      if (ctx.query.startDate) where[field].$gte = ctx.query.startDate;
      if (ctx.query.endDate) where[field].$lte = ctx.query.endDate;
    }
    return where;
  };

  return {
    async clicks(ctx: any) {
      try {
        const { page = 1, pageSize = 20 } = ctx.query;
        const where = buildWhere(ctx, ["coupon", "sourceTag", "promoChannelId", "deviceFingerprint"]);
        if (ctx.query.dateField === undefined) {
          if (where.createdAt) { where.clickedAt = where.createdAt; delete where.createdAt; }
        }
        const [results, total] = await Promise.all([
          strapi.documents(CLICK_UID).findMany({
            where,
            orderBy: { clickedAt: "desc" },
            offset: ((Number(page)) - 1) * Number(pageSize),
            limit: Number(pageSize),
            populate: { coupon: true, sourceTag: true },
          }),
          strapi.db.query(CLICK_UID).count({ where }),
        ]);
        ctx.body = wrapList({ results, total, page: Number(page), pageSize: Number(pageSize) });
      } catch (e: any) {
        ctx.status = 400;
        ctx.body = { error: e.message };
      }
    },

    async orders(ctx: any) {
      try {
        const { page = 1, pageSize = 20 } = ctx.query;
        const where = buildWhere(ctx, ["promoChannelId", "commissionStatus", "orderStatus"]);
        if (ctx.query.startDate || ctx.query.endDate) {
          where.transactedAt = where.createdAt || {};
          delete where.createdAt;
        }
        const [results, total] = await Promise.all([
          strapi.documents(ORDER_UID).findMany({
            where,
            orderBy: { transactedAt: "desc" },
            offset: ((Number(page)) - 1) * Number(pageSize),
            limit: Number(pageSize),
            populate: { coupon: true, matchedClick: true, sourceTag: true },
          }),
          strapi.db.query(ORDER_UID).count({ where }),
        ]);
        ctx.body = wrapList({ results, total, page: Number(page), pageSize: Number(pageSize) });
      } catch (e: any) {
        ctx.status = 400;
        ctx.body = { error: e.message };
      }
    },

    async sourceTags(ctx: any) {
      try {
        const { page = 1, pageSize = 20 } = ctx.query;
        const where = buildWhere(ctx, ["promoChannelId"]);
        const [results, total] = await Promise.all([
          strapi.documents(SOURCE_TAG_UID).findMany({
            where,
            orderBy: { lastSeenAt: "desc" },
            offset: ((Number(page)) - 1) * Number(pageSize),
            limit: Number(pageSize),
          }),
          strapi.db.query(SOURCE_TAG_UID).count({ where }),
        ]);
        ctx.body = wrapList({ results, total, page: Number(page), pageSize: Number(pageSize) });
      } catch (e: any) {
        ctx.status = 400;
        ctx.body = { error: e.message };
      }
    },
  };
};
