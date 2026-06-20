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
  memberCreateSchema,
  memberInviteSchema,
  memberUpdateSchema,
  validateOrThrow,
} from "../validators";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx) {
    try {
      const service = strapi.plugin("zhao-channel").service("channel-member");
      const result = await service.find(ctx.query);
      ctx.body = wrapList(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async findOne(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel-member");
      const result = await service.findOne(parsed.id);
      if (!result) { ctx.status = 404; ctx.body = { error: "Member not found" }; return; }
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async create(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      if (body.channelId !== undefined || body.inviterId !== undefined) {
        const parsed = validateOrThrow(memberInviteSchema, body, ctx);
        if (!parsed) return;
        const service = strapi.plugin("zhao-channel").service("channel-member");
        const result = await service.inviteMember(parsed.channelId, parsed.inviterId, {
          email: parsed.email,
          role: parsed.role,
        });
        ctx.body = wrap(result);
        return;
      }
      const parsed = validateOrThrow(memberCreateSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel-member");
      const result = await service.createMember(parsed);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async update(ctx) {
    try {
      const paramParsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!paramParsed) return;
      const body = ctx.request.body?.data || ctx.request.body;
      const bodyParsed = validateOrThrow(memberUpdateSchema, body, ctx);
      if (!bodyParsed) return;
      const service = strapi.plugin("zhao-channel").service("channel-member");
      const result = await service.updateMember(paramParsed.id, bodyParsed);
      if (!result) { ctx.status = 404; ctx.body = { error: "Member not found" }; return; }
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async delete(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel-member");
      const result = await service.deleteMember(parsed.id);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },
});
