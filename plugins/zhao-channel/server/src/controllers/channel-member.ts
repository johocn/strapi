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
      const service = strapi.plugin("zhao-channel").service("channel-member");
      const query = { ...ctx.query };
      // 渠道范围过滤
      const cf = this._channelFilter(ctx, "channel");
      if (cf) {
        // 合并到 query：service.find 用 channel 字段做 documentId 过滤，这里用 channel.id
        query.channel = query.channel ? { $and: [{ documentId: query.channel }, cf.channel] } : cf.channel;
      }
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
      const service = strapi.plugin("zhao-channel").service("channel-member");
      const result = await service.findOne(parsed.id);
      if (!result) { ctx.status = 404; ctx.body = { error: "Member not found" }; return; }
      // 校验渠道归属
      this._assertInScope(ctx, result, "channel");
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async create(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      // 校验 channelId 是否在 scope 内（两个分支都需要）
      const channelDocId = body.channelId ?? body.channel?.documentId ?? body.channel;
      if (channelDocId) {
        const channel = await strapi.db.query("plugin::zhao-channel.channel").findOne({
          where: { documentId: typeof channelDocId === "string" ? channelDocId : String(channelDocId) },
          select: ["id"],
        });
        if (channel) {
          this._assertInScope(ctx, channel, "id");
        }
      }
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
      // 先查目标记录，校验渠道归属
      const service = strapi.plugin("zhao-channel").service("channel-member");
      const existing = await service.findOne(paramParsed.id);
      if (!existing) { ctx.status = 404; ctx.body = { error: "Member not found" }; return; }
      this._assertInScope(ctx, existing, "channel");
      const body = ctx.request.body?.data || ctx.request.body;
      const bodyParsed = validateOrThrow(memberUpdateSchema, body, ctx);
      if (!bodyParsed) return;
      const result = await service.updateMember(paramParsed.id, bodyParsed);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async delete(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      // 先查目标记录，校验渠道归属
      const service = strapi.plugin("zhao-channel").service("channel-member");
      const existing = await service.findOne(parsed.id);
      if (!existing) { ctx.status = 404; ctx.body = { error: "Member not found" }; return; }
      this._assertInScope(ctx, existing, "channel");
      const result = await service.deleteMember(parsed.id);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },
});
