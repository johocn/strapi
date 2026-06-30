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
import {
  channelIdParam,
  useInviteSchema,
  userIdQuerySchema,
  validateOrThrow,
} from "../validators";

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

  async find(ctx) {
    try {
      const service = strapi.plugin("zhao-channel").service("user-invite");
      const query = { ...ctx.query };
      // 渠道范围过滤（inviteChannel 字段）
      const cf = this._channelFilter(ctx, "inviteChannel");
      if (cf) Object.assign(query, cf);
      const result = await service.find(query);
      ctx.body = wrapList(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async findOne(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("user-invite");
      const result = await service.findOne(parsed.id);
      if (!result) { ctx.status = 404; ctx.body = { error: "Invite not found" }; return; }
      // 校验渠道归属
      this._assertInScope(ctx, result, "inviteChannel");
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async create(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      // 校验 body.inviteChannel（documentId）是否在 scope 内
      if (body?.inviteChannel) {
        const channelDocId = typeof body.inviteChannel === "string" ? body.inviteChannel : body.inviteChannel?.documentId;
        if (channelDocId) {
          const channel = await strapi.db.query("plugin::zhao-channel.channel").findOne({
            where: { documentId: channelDocId },
            select: ["id"],
          });
          if (channel) {
            this._assertInScope(ctx, channel, "id");
          }
        }
      }
      const service = strapi.plugin("zhao-channel").service("user-invite");
      const result = await service.create(body);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async update(ctx) {
    try {
      const paramParsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!paramParsed) return;
      const service = strapi.plugin("zhao-channel").service("user-invite");
      // 先查目标记录，校验渠道归属
      const existing = await service.findOne(paramParsed.id);
      if (!existing) { ctx.status = 404; ctx.body = { error: "Invite not found" }; return; }
      this._assertInScope(ctx, existing, "inviteChannel");
      const result = await service.update(paramParsed.id, ctx.request.body);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async delete(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("user-invite");
      // 先查目标记录，校验渠道归属
      const existing = await service.findOne(parsed.id);
      if (!existing) { ctx.status = 404; ctx.body = { error: "Invite not found" }; return; }
      this._assertInScope(ctx, existing, "inviteChannel");
      const result = await service.delete(parsed.id);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async useInvite(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.status = 401; ctx.body = { error: "未认证", code: "UNAUTHORIZED" };
        return;
      }
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(useInviteSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("user-invite");
      const result = await service.useInvite(parsed.code, userId);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async getMyChain(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (userId) {
        const service = strapi.plugin("zhao-channel").service("user-invite");
        const result = await service.getDistributionChain(userId);
        ctx.body = wrap(result);
      } else {
        const parsed = validateOrThrow(userIdQuerySchema, ctx.query, ctx);
        if (!parsed) return;
        const service = strapi.plugin("zhao-channel").service("user-invite");
        const result = await service.getDistributionChain(parsed.userId);
        ctx.body = wrap(result);
      }
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async getMyDownstream(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (userId) {
        const service = strapi.plugin("zhao-channel").service("user-invite");
        const result = await service.getDirectDownstream(userId);
        ctx.body = wrapList(result);
      } else {
        const parsed = validateOrThrow(userIdQuerySchema, ctx.query, ctx);
        if (!parsed) return;
        const service = strapi.plugin("zhao-channel").service("user-invite");
        const result = await service.getDirectDownstream(parsed.userId);
        ctx.body = wrapList(result);
      }
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async getMyStats(ctx) {
    try {
      const userId = ctx.state.user?.id || (() => {
        const parsed = validateOrThrow(userIdQuerySchema, ctx.query, ctx);
        return parsed?.userId || null;
      })();

      if (!userId) {
        ctx.status = 400;
        ctx.body = { error: "用户ID无效" };
        return;
      }

      const service = strapi.plugin("zhao-channel").service("user-invite");
      let result = await service.getUserDistributionStats(userId);

      if (!result) {
        await service.createForUser(userId);
        result = await service.getUserDistributionStats(userId);
      }

      ctx.body = wrap(result || {
        userId,
        inviteCode: null,
        inviteMethod: "organic",
        distributionDepth: 0,
        distributionChain: [],
        boundChannel: null,
        stats: {
          directCount: 0,
          totalDownstreamCount: 0,
          maxDepth: 0,
        },
      });
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  /**
   * SSO 远程同步分销关系（供 RemoteChannelSync 调用）
   * 请求体：{ userId, inviteCode?, channelCode? }
   */
  async syncInvite(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { userId, inviteCode, channelCode } = body || {};

      if (!userId || typeof userId !== "number") {
        ctx.status = 400;
        ctx.body = { error: "userId 必填且为数字" };
        return;
      }

      const service = strapi.plugin("zhao-channel").service("user-invite");
      const result = await service.createForUser(userId, undefined, undefined, inviteCode, channelCode);

      ctx.body = { success: true, data: result };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },
});
