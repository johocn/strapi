import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const wrapList = (result: any) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    try {
      const isAdmin = ctx.path?.includes("/admin/") ?? false;
      const publicOnly = !isAdmin;
      const channelScope = ctx.state.channelScope
        || (publicOnly ? { all: true, channelIds: [], isGuest: true } : { all: true, channelIds: [], isGuest: false });

      ctx.body = wrapList(await strapi.plugin("zhao-course").service("course").find(ctx.query, publicOnly, {
        channelScope,
        mergedChannelIds: ctx.state.mergedChannelIds || [],
        siteChannelIds: ctx.state.siteChannelIds || [],
        crossChannelEnabled: ctx.state.crossChannelEnabled ?? true,
      }));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课程 ID" };
        return;
      }
      const isAdmin = ctx.path?.includes("/admin/") ?? false;
      const publicOnly = !isAdmin;
      const result = await strapi.plugin("zhao-course").service("course").findOne(documentId, publicOnly);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "课程不存在" };
        return;
      }
      // 检查课程访问权限
      const hasAccess = await this.checkCourseAccess(ctx, result);
      if (!hasAccess) {
        ctx.status = 403;
        ctx.body = { error: "该课程仅限渠道成员访问" };
        return;
      }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  /**
   * 检查用户是否有课程访问权限
   */
  async checkCourseAccess(ctx: any, result: any): Promise<boolean> {
    const isAdmin = ctx.path?.includes("/admin/") ?? false;
    if (!isAdmin && ctx.state.publicOnly !== false) {
      const ch = result as any;
      // 全渠道课程无需权限检查
      if (ch.channelScope === "all") {
        return true;
      }
      // 允许跨渠道访问的课程无需权限检查（需跨渠道功能开启时才生效，与列表层逻辑对齐）
      const crossChannelEnabled = ctx.state.crossChannelEnabled !== false;
      if (crossChannelEnabled && ch.channelScope === "specific" && ch.allowCrossChannel === true) {
        return true;
      }
      // 指定渠道且不允许跨渠道：检查 mergedChannelIds 交集
      if (ch.channelScope === "specific" && ch.allowCrossChannel === false) {
        const mergedChannelIds = ctx.state.mergedChannelIds || ctx.state.channelScope?.channelIds || [];
        const courseChannelIds = Array.isArray(ch.channelIds) ? ch.channelIds : [];
        const hasAccess = mergedChannelIds.some((mid: any) => courseChannelIds.some(cid => String(mid) === String(cid)));
        if (!hasAccess) {
          return false;
        }
      }
    }
    return true;
  },

  async create(ctx: any) {
    try {
      let data = ctx.request.body?.data || ctx.request.body;

      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (parseErr) {
          ctx.status = (parseErr as any).status || 400;
          ctx.body = { error: "无效的 JSON 数据" };
          return;
        }
      }

      if (!data?.title) {
        ctx.status = 400;
        ctx.body = { error: "缺少课程标题" };
        return;
      }

      if (typeof data.title !== "string" || data.title.trim().length === 0) {
        ctx.status = 400;
        ctx.body = { error: "课程标题必须是有效的字符串" };
        return;
      }

      const result = await strapi.plugin("zhao-course").service("course").create(data, { siteId: ctx.state?.siteId });
      ctx.status = 201;
      ctx.body = result;
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;

      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课程 ID" };
        return;
      }

      let data = ctx.request.body?.data || ctx.request.body;

      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (parseErr) {
          ctx.status = (parseErr as any).status || 400;
          ctx.body = { error: "无效的 JSON 数据" };
          return;
        }
      }

      ctx.body = wrap(await strapi.plugin("zhao-course").service("course").update(documentId, data, { siteId: ctx.state?.siteId }));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;

      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课程 ID" };
        return;
      }

      ctx.body = wrap(await strapi.plugin("zhao-course").service("course").delete(documentId));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async publish(ctx: any) {
    try {
      const { documentId } = ctx.params;
      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课程ID" };
        return;
      }
      const courseService = strapi.plugin("zhao-course").service("course");
      ctx.body = await courseService.publish(documentId);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async unpublish(ctx: any) {
    try {
      const { documentId } = ctx.params;
      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课程ID" };
        return;
      }
      const courseService = strapi.plugin("zhao-course").service("course");
      ctx.body = wrap(await courseService.unpublish(documentId));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  /**
   * 列出渠道配置异常的课程（admin 巡检用）
   * GET /zhao-course/v1/admin/courses/channel-config-invalid
   * 返回：{ data: [{ documentId, title, channelScope, channelIds, pointChannel, reason }] }
   */
  async listChannelConfigInvalid(ctx: any) {
    try {
      const invalid = await strapi.plugin("zhao-course").service("course").listChannelConfigInvalid();
      ctx.body = { data: invalid, meta: { count: invalid.length } };
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
});
