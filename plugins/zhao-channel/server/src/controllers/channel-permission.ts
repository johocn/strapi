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
  permissionCheckSchema,
  batchGrantSchema,
  validateOrThrow,
} from "../validators";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async checkPermission(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(permissionCheckSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel-permission");
      const hasPermission = await service.checkUserChannelPermission(parsed.userId, parsed.channelId);
      ctx.body = wrap({ hasPermission });
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async getUserChannels(ctx) {
    try {
      const userId = ctx.state.user?.id || ctx.params.userId;
      const service = strapi.plugin("zhao-channel").service("channel-permission");
      const channels = await service.getUserChannels(userId);
      ctx.body = wrapList(channels);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async getMyChannelTree(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "未登录" };
        return;
      }
      const service = strapi.plugin("zhao-channel").service("channel-permission");
      const channels = await service.getMyChannelTree(userId);
      ctx.body = wrapList(channels);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async batchGrant(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(batchGrantSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel-permission");
      if (parsed.type === "role") {
        ctx.body = wrap(await service.grantChannelsToRole(parsed.targetId, parsed.channelIds, parsed.grantedBy));
      } else {
        ctx.body = wrap(await service.grantChannelsToUser(parsed.targetId, parsed.channelIds, parsed.grantedBy));
      }
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },
});
