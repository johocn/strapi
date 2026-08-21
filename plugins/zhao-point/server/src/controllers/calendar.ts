import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.plugin("zhao-point").service("calendar-service");
  return ({
    // GET /activities/calendar?month=YYYY-MM  — C端：仅已发布可报名
    async month(ctx: any) {
      try {
        ctx.body = wrap(await svc().getCalendarMonth({ month: ctx.query.month, includeAllStatus: false }));
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },
    // GET /adm/activities/calendar?month=YYYY-MM  — 管理端：全部状态
    async adminMonth(ctx: any) {
      try {
        ctx.body = wrap(await svc().getCalendarMonth({ month: ctx.query.month, includeAllStatus: true }));
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },
  });
};