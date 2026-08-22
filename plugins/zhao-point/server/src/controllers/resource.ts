import type { Core } from "@strapi/strapi";

const ACTIVITY_UID = "plugin::zhao-point.activity";
const LECTURER_UID = "plugin::zhao-point.lecturer";
const VENUE_UID = "plugin::zhao-point.venue";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const resService = () => strapi.plugin("zhao-point").service("resource-schedule");
  const labelMap: Record<string, string> = {
    lecturer: "讲师", venue: "场地",
  };

  const uidOf = (type: string) => (type === "lecturer" ? LECTURER_UID : VENUE_UID);

  async function resolveNames(conflicts: any[]) {
    for (const c of conflicts) {
      const row = await strapi.db.query(uidOf(c.resourceType)).findOne({ where: { id: c.resourceId }, select: ["name", "defaultBufferMin"] });
      c.resourceName = row?.name ?? c.resourceName;
      c.resourceNameLabel = labelMap[c.resourceType] ?? c.resourceType;
      c.resourceBufferMin = row ? Number(row.defaultBufferMin) : c.resourceBufferMin;
    }
  }

  async function listType(type: string, ctx: any) {
    try {
      const { page = "1", pageSize = "50", includeDisabled } = ctx.query;
      const where: any = {};
      if (includeDisabled !== "true" && includeDisabled !== "1") where.disabled = false;
      const result = await strapi.db.query(uidOf(type)).findPage({
        where,
        orderBy: { disabled: "asc", name: "asc" },
        page: parseInt(page), pageSize: parseInt(pageSize),
      });
      ctx.body = { rows: result?.results ?? [], pagination: result?.pagination ?? {} };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  }

  function crudHandlers(type: string) {
    return {
      // 统一入口：list/create/findOne/update/delete
      async list(ctx: any) { return listType(type, ctx); },
      async create(ctx: any) {
        try {
          const body = ctx.request.body?.data || ctx.request.body;
          const row = await strapi.documents(uidOf(type)).create({ data: body });
          ctx.body = wrap(row);
        } catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
      },
      async findOne(ctx: any) {
        try {
          const row = await strapi.documents(uidOf(type)).findOne({ documentId: ctx.params.documentId });
          if (!row) { ctx.status = 404; ctx.body = { error: `${labelMap[type]}不存在` }; return; }
          ctx.body = wrap(row);
        } catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
      },
      async update(ctx: any) {
        try {
          const body = ctx.request.body?.data || ctx.request.body;
          const row = await strapi.documents(uidOf(type)).update({ documentId: ctx.params.documentId, data: body });
          ctx.body = wrap(row);
        } catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
      },
      async del(ctx: any) {
        try {
          // 软删除：仅置 disabled=true，保留历史活动关联
          const row = await strapi.documents(uidOf(type)).update({ documentId: ctx.params.documentId, data: { disabled: true } });
          ctx.body = wrap(row);
        } catch (e: any) { ctx.status = 400; ctx.body = { error: e.message }; }
      },
    };
  }

  return {
    lecturers: {
      list: crudHandlers("lecturer").list,
      create: crudHandlers("lecturer").create,
      findOne: crudHandlers("lecturer").findOne,
      update: crudHandlers("lecturer").update,
      del: crudHandlers("lecturer").del,
    },
    venues: {
      list: crudHandlers("venue").list,
      create: crudHandlers("venue").create,
      findOne: crudHandlers("venue").findOne,
      update: crudHandlers("venue").update,
      del: crudHandlers("venue").del,
    },
    // GET /adm/schedules?type=lecturer|venue&resourceId=&from=&to=
    async schedules(ctx: any) {
      try {
        const { type, resourceId, from, to } = ctx.query;
        if (!type || !resourceId) { ctx.status = 400; ctx.body = { error: "缺少 type/resourceId" }; return; }
        const uid = uidOf(type);
        const where: any = {
          [type]: parseInt(resourceId, 10),
          startTime: { $notNull: true },
          status: { $notIn: ["draft"] },
          ...(from ? { startTime: { $gte: new Date(from).toISOString(), ...(to ? { $lte: new Date(to).toISOString() } : {}) } } : {}),
        };
        if (from && to) where.startTime = { $gte: new Date(from).toISOString(), $lte: new Date(to).toISOString() };
        else if (to) where.startTime = { $lte: new Date(to).toISOString() };
        const rows = await strapi.db.query(ACTIVITY_UID).findMany({
          where,
          orderBy: { startTime: "desc" },
          select: ["id", "title", "startTime", "endTime", "status"],
        });
        const resource = await strapi.db.query(uid).findOne({ where: { id: parseInt(resourceId, 10) }, select: ["id", "name", "defaultBufferMin", "disabled"] });
        ctx.body = { resource, rows };
      } catch (e: any) {
        ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
      }
    },
    // POST /adm/schedules/check  —— 新建/改期前的冲突预检，返回 conflicts + suggestions
    async check(ctx: any) {
      try {
        const body = ctx.request.body?.data || ctx.request.body;
        const svc = resService();
        const result = await svc.check({
          start: body.startTime,
          end: body.endTime,
          excludeActivityId: body.excludeActivityId ? parseInt(body.excludeActivityId, 10) : undefined,
          lecturerId: body.lecturerId ? parseInt(body.lecturerId, 10) : undefined,
          venueId: body.venueId ? parseInt(body.venueId, 10) : undefined,
        });
        if (result.ok) { ctx.body = { ok: true, conflicts: [] }; return; }
        await resolveNames(result.conflicts);
        const suggestions: any[] = [];
        for (const c of result.conflicts) {
          const sugg = await svc.suggest({
            type: c.resourceType,
            resourceId: c.resourceId,
            start: body.startTime,
            end: body.endTime,
            excludeActivityId: body.excludeActivityId ? parseInt(body.excludeActivityId, 10) : undefined,
          });
          suggestions.push({ resourceType: c.resourceType, resourceId: c.resourceId, candidates: sugg });
        }
        ctx.body = { ok: false, conflicts: result.conflicts, suggestions };
      } catch (e: any) {
        ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
      }
    },
  };
};