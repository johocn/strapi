"use strict";

const TODO_UID = "plugin::zhao-sso.manual-sop-todo";

export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    try {
      const { status } = ctx.query;
      const where: any = {};
      if (status) where.status = status;
      const rows = await strapi.db.query(TODO_UID).findMany({ where, orderBy: { createdAt: "DESC" } });
      ctx.body = { data: rows };
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { error: e.message };
    }
  },

  async dispatch(ctx: any) {
    try {
      const sop = strapi.plugin("zhao-sso").service("sso-sop");
      // 名单解析委托给 zhao-point 的回调，避免 zhao-sso 反向依赖 zhao-point。
      // activity-sop-audience 由 zhao-point 在 Task 4 提供，此时可能尚未存在：
      // 缺插件或在运行时报错均由该回调自动向外抛出，外层 catch 置 400，不影响本插件 build/加载。
      const resolveTargetUsers = (audience: any) => {
        const pt = strapi.plugin("zhao-point");
        if (!pt) throw new Error("zhao-point 插件不可用，无法解析目标名单");
        return pt.service("activity-sop-audience").resolveAudience(audience);
      };
      const res = await sop.dispatchManualTodo(ctx.params.id, resolveTargetUsers);
      ctx.body = res;
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { error: e.message };
    }
  },

  async skip(ctx: any) {
    try {
      await strapi.db.query(TODO_UID).update({
        where: { id: Number(ctx.params.id) },
        data: { status: "skipped", doneAt: new Date().toISOString() },
      });
      ctx.body = { ok: true };
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { error: e.message };
    }
  },
});