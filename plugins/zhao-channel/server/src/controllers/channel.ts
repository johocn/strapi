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
import { getTierTree } from "../config/tiers";
import {
  channelIdParam,
  tierTreeParam,
  channelCreateSchema,
  channelUpdateSchema,
  channelRootCreateSchema,
  registerSchema,
  validateCodeSchema,
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
      const service = strapi.plugin("zhao-channel").service("channel");
      // /my/channels 走 userRoute，policy 链不含 has-channel-scope，
      // 需手动调用 channel-scope service.resolve(user) 获取 channelScope
      // 安全修复（卡点 E）：非 admin 用户仅返回授权渠道，防止越权查看
      const query = { ...ctx.query };
      if (!ctx.state?.channelScope && ctx.state?.user) {
        const scope = await this._scopeSvc()?.resolve?.(ctx.state.user);
        if (scope) {
          const cf = this._scopeSvc()?.buildChannelFilter?.(scope, "id");
          if (cf) Object.assign(query, cf);
        }
      } else if (ctx.state?.channelScope) {
        // 如已被 policy 注入（如未来路由变更），复用之
        const cf = this._channelFilter(ctx, "id");
        if (cf) Object.assign(query, cf);
      }
      ctx.body = wrapList(await service.find(query));
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async findOne(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.findOne(parsed.id);
      if (!result) { ctx.status = 404; ctx.body = { error: "Channel not found" }; return; }
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async create(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(channelCreateSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      ctx.body = wrap(await service.create(parsed));
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async update(ctx) {
    try {
      const paramParsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!paramParsed) return;
      const body = ctx.request.body?.data || ctx.request.body;
      const bodyParsed = validateOrThrow(channelUpdateSchema, body, ctx);
      if (!bodyParsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.update(paramParsed.id, bodyParsed);
      if (!result) { ctx.status = 404; ctx.body = { error: "Channel not found" }; return; }
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async delete(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      ctx.body = wrap(await service.delete(parsed.id));
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async register(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(registerSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.register(parsed);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async validate(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(validateCodeSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.validateCode(parsed.code);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async validatePublic(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(validateCodeSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.validateCode(parsed.code);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async registerPublic(ctx) {
    try {
      const parsed = validateOrThrow(registerSchema, ctx.request.body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.register(parsed);

      let token = null;
      if (result.user) {
        const jwtService = strapi.plugin("zhao-auth").service("jwt");
        token = await jwtService.sign({
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
        });
      }

      ctx.body = { ...result, token };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async getNetwork(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.getNetwork(parsed.id);
      if (!result) { ctx.status = 404; ctx.body = { error: "Channel not found" }; return; }
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async getStats(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.getStats(parsed.id);
      if (!result) { ctx.status = 404; ctx.body = { error: "Channel not found" }; return; }
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async getPublic(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.getPublic(parsed.id);
      if (!result) { ctx.status = 404; ctx.body = { error: "Channel not found" }; return; }
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async adminFind(ctx) {
    try {
      const service = strapi.plugin("zhao-channel").service("channel");
      // 渠道自身过滤：非 admin 仅返回 channelIds 范围内的渠道
      const query = { ...ctx.query };
      const cf = this._channelFilter(ctx, "id");
      if (cf) Object.assign(query, cf);
      ctx.body = wrapList(await service.find(query));
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async adminFindOne(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.findOne(parsed.id);
      if (!result) { ctx.status = 404; ctx.body = { error: "Channel not found" }; return; }
      // 校验渠道归属：channel 自身用 id 字段
      this._assertInScope(ctx, { id: result.id }, "id");
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async adminCreate(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi.plugin("zhao-channel").service("channel");
      if (body.parentChannel) {
        // 校验 parentChannel 是否在 scope 内
        const parentDocId = typeof body.parentChannel === "string" ? body.parentChannel : body.parentChannel?.documentId;
        if (parentDocId) {
          const parent = await strapi.db.query("plugin::zhao-channel.channel").findOne({
            where: { documentId: parentDocId },
            select: ["id"],
          });
          if (parent) {
            this._assertInScope(ctx, parent, "id");
          }
        }
        const parsed = validateOrThrow(channelCreateSchema, body, ctx);
        if (!parsed) return;
        ctx.body = wrap(await service.create(parsed));
      } else {
        const parsed = validateOrThrow(channelRootCreateSchema, body, ctx);
        if (!parsed) return;
        ctx.body = wrap(await service.createRoot(parsed));
      }
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async adminCreateRoot(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const parsed = validateOrThrow(channelRootCreateSchema, body, ctx);
      if (!parsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      ctx.body = wrap(await service.createRoot(parsed));
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async adminGetChildren(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      // 校验父渠道在 scope 内
      this._assertInScope(ctx, { id: parsed.id }, "id");
      const service = strapi.plugin("zhao-channel").service("channel");
      const network = await service.getNetwork(parsed.id);
      ctx.body = wrapList(network?.children || []);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async adminGetHierarchy(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      // 校验目标渠道在 scope 内
      this._assertInScope(ctx, { id: parsed.id }, "id");
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.getHierarchy(parsed.id);
      if (!result) { ctx.status = 404; ctx.body = { error: "Channel not found" }; return; }
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async adminUpdate(ctx) {
    try {
      const paramParsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!paramParsed) return;
      // 校验目标渠道在 scope 内
      this._assertInScope(ctx, { id: paramParsed.id }, "id");
      const body = ctx.request.body?.data || ctx.request.body;
      const bodyParsed = validateOrThrow(channelUpdateSchema, body, ctx);
      if (!bodyParsed) return;
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.update(paramParsed.id, bodyParsed);
      if (!result) { ctx.status = 404; ctx.body = { error: "Channel not found" }; return; }
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async updateConfig(ctx) {
    try {
      const paramParsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!paramParsed) return;
      // 校验目标渠道在 scope 内
      this._assertInScope(ctx, { id: paramParsed.id }, "id");
      let data = ctx.request.body?.data || ctx.request.body;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch {
          ctx.status = 400;
          ctx.body = { error: "无效的 JSON 数据" };
          return;
        }
      }
      const cleaned = { extraConfig: data.extraConfig || {} };
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.update(paramParsed.id, cleaned);
      if (!result) { ctx.status = 404; ctx.body = { error: "Channel not found" }; return; }
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async adminDelete(ctx) {
    try {
      const parsed = validateOrThrow(channelIdParam, ctx.params, ctx);
      if (!parsed) return;
      // 校验目标渠道在 scope 内
      this._assertInScope(ctx, { id: parsed.id }, "id");
      const service = strapi.plugin("zhao-channel").service("channel");
      ctx.body = wrap(await service.delete(parsed.id));
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },

  async adminGetTierTree(ctx) {
    try {
      const parsed = validateOrThrow(tierTreeParam, ctx.params, ctx);
      if (!parsed) return;
      ctx.body = wrap(getTierTree(parsed.parentTier));
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: e.code };
    }
  },
});
