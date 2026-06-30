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
  // 渠道范围过滤工具
  _scopeSvc() {
    return strapi.plugin("zhao-auth")?.service("channel-scope");
  },
  _channelFilter(ctx: any, field: string): Record<string, any> | null {
    return this._scopeSvc()?.buildChannelFilter?.(ctx.state?.channelScope, field) ?? null;
  },
  _assertInScope(ctx: any, record: any, field: string): void {
    this._scopeSvc()?.assertRecordInScope?.(ctx.state?.channelScope, record, field);
  },
  // 通过 channel documentId 校验是否在 scope 内（复用 channel-scope.service）
  async _assertChannelDocIdInScope(ctx: any, channelDocumentId: string): Promise<void> {
    await this._scopeSvc()?.assertChannelDocIdInScope?.(ctx.state?.channelScope, channelDocumentId);
  },

  async find(ctx: any) {
    try {
      const query = { ...ctx.query };
      // 注入 channel 渠道过滤
      const cf = this._channelFilter(ctx, "channel");
      if (cf) {
        query.filters = { ...(query.filters ?? {}), ...cf };
      }
      ctx.body = wrapList(await strapi.plugin("zhao-course").service("user-course-auth").find(query));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-course").service("user-course-auth").findOne(documentId);
      if (!result) { ctx.status = 404; ctx.body = { error: "授权记录不存在" }; return; }
      // 校验渠道归属
      if (result.channel != null) {
        const normalized = typeof result.channel === "number" ? { id: result.channel } : result.channel;
        this._assertInScope(ctx, { channel: normalized }, "channel");
      }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async create(ctx: any) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.plugin("zhao-course").service("user-course-auth").create(data);
      ctx.status = 201;
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap(await strapi.plugin("zhao-course").service("user-course-auth").update(documentId, data));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-course").service("user-course-auth").delete(documentId));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  /**
   * 授权课程给用户
   */
  async grant(ctx: any) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      // 校验 body.channel（documentId）是否在 scope 内
      if (data?.channel) {
        const channelDocId = typeof data.channel === "string" ? data.channel : data.channel?.documentId;
        if (channelDocId) {
          await this._assertChannelDocIdInScope(ctx, channelDocId);
        }
      }
      const result = await strapi.plugin("zhao-course").service("user-course-auth").create(data);
      ctx.status = 201;
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  /**
   * 撤销用户课程授权
   */
  async revoke(ctx: any) {
    try {
      const { documentId } = ctx.params;
      // 先查目标记录，校验渠道归属
      const existing = await strapi.plugin("zhao-course").service("user-course-auth").findOne(documentId);
      if (!existing) { ctx.status = 404; ctx.body = { error: "授权记录不存在" }; return; }
      if (existing.channel != null) {
        const normalized = typeof existing.channel === "number" ? { id: existing.channel } : existing.channel;
        this._assertInScope(ctx, { channel: normalized }, "channel");
      }
      ctx.body = wrap(await strapi.plugin("zhao-course").service("user-course-auth").delete(documentId));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  /**
   * 查询课程授权状态
   */
  async checkAuth(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      const { courseDocumentId } = ctx.params;

      if (!userId) {
        ctx.status = 401; ctx.body = { error: "用户未登录" }; return;
      }

      if (!courseDocumentId) {
        ctx.status = 400; ctx.body = { error: "缺少课程 ID" }; return;
      }

      const result = await strapi.plugin("zhao-course").service("user-course-auth").checkAuth(userId, courseDocumentId);
      ctx.body = wrap(result);
    } catch (err: any) {
      ctx.status = err.status || 400; ctx.body = { error: err.message || err }; return;
    }
  },

  /**
   * 获取我的授权课程
   */
  async myCourses(ctx: any) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        ctx.status = 401; ctx.body = { error: "用户未登录" }; return;
      }

      ctx.body = wrapList(await strapi.plugin("zhao-course").service("user-course-auth").getUserAuthCourses(userId));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },
});
