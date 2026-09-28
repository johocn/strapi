import crypto from "crypto";
import type { Core } from "@strapi/strapi";

const UP_USER_UID = "plugin::users-permissions.user";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.plugin("zhao-point").service("product-survey");

  // 解析当前请求的真实 up_user id（身份一律取登录态，不接受前端传 userId）。
  // SSO 登录时 ctx.state.user 是 sso_user（含 uuid），需先桥接为业务 up_user 再落库
  // （product_survey_* 的 user 关联 plugin::users-permissions.user）；桥接失败时自动创建业务账号。
  const getUserId = async (ctx: any): Promise<number> => {
    const u: any = ctx.state.user;
    if (u?.uuid) {
      const ssoProfile = strapi.plugin("zhao-sso")?.service("sso-profile");
      let up = ssoProfile && (await ssoProfile.resolveUpUserForSsoUser(u.id));
      if (!up?.id) {
        const ssoUser = await strapi.db
          .query("plugin::zhao-sso.sso-user")
          .findOne({ where: { id: u.id }, select: ["username", "email", "mobile"] });
        const username = ssoUser?.username || `wx_${u.id}`;
        up = await strapi.db.query(UP_USER_UID).create({
          data: {
            username,
            email: ssoUser?.email || `${username}@autobridge.local`,
            password: crypto.randomBytes(16).toString("hex"),
            provider: "local",
            confirmed: true,
            blocked: false,
          },
        });
      }
      try {
        const memberSvc = strapi.plugin("zhao-channel")?.service("channel-member");
        if (memberSvc && typeof memberSvc.ensureDefaultChannel === "function") {
          await memberSvc.ensureDefaultChannel(up.id, ctx.state?.siteDocumentId);
        }
      } catch (e: any) {
        strapi.log.warn(`[zhao-point:product-survey] ensureDefaultChannel failed (user=${up.id}): ${e.message}`);
      }
      return up.id;
    }
    return u.id || u.documentId;
  };

  // 渠道隔离字段一律由服务端按当前请求站点解析（取站点可用渠道的第一个），不接受前端传值。
  // 解析不到渠道时抛 400「无法解析当前渠道」。
  const resolveChannel = async (ctx: any): Promise<string> => {
    const siteDocId = ctx.state?.siteDocumentId;
    const siteSvc = strapi.plugin("zhao-common")?.service("site-config");
    const siteChannels = siteSvc?.getAvailableChannels && siteDocId ? await siteSvc.getAvailableChannels(siteDocId) : null;
    const id = Array.isArray(siteChannels) && siteChannels.length > 0 ? siteChannels[0].id : undefined;
    if (id == null) {
      const e: any = new Error("无法解析当前渠道");
      e.status = 400;
      throw e;
    }
    return String(id);
  };

  return {
    // GET /my/product-survey/vote?roundKey=&source=
    async myVote(ctx: any) {
      try {
        const userId = await getUserId(ctx);
        const channel = await resolveChannel(ctx);
        const roundKey = svc().assertRoundKey(ctx.query.roundKey);
        ctx.body = wrap(await svc().getMyVote({ channel, roundKey, userId }));
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },

    // POST /my/product-survey/vote
    async submitVote(ctx: any) {
      try {
        const userId = await getUserId(ctx);
        const channel = await resolveChannel(ctx);
        const body = ctx.request.body?.data || ctx.request.body || {};
        const result = await svc().submit({
          channel,
          roundKey: body.roundKey,
          userId,
          source: body.source,
          votes: body.votes,
          freeInput: body.freeInput,
        });
        ctx.body = wrap(result);
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },

    // GET /admin/product-survey/board?channel=&roundKey=&source=
    async board(ctx: any) {
      try {
        const { channel, roundKey, source } = ctx.query;
        const rk = svc().assertRoundKey(roundKey);
        const scope = ctx.state?.channelScope;

        // 显式 channel 优先；非 admin 且显式指定 scope 外渠道 → 403；否则按 scope 收窄
        let channelIds: string[] | null = null;
        if (scope && !scope.all) {
          channelIds = (Array.isArray(scope.channelIds) ? scope.channelIds : []).map((id: number) => String(id));
        }
        let explicitChannel: string | undefined;
        if (channel != null && channel !== "") {
          explicitChannel = String(channel);
          if (channelIds && !channelIds.includes(explicitChannel)) {
            const e: any = new Error("无权访问该渠道的数据");
            e.status = 403;
            throw e;
          }
        }
        if (explicitChannel) channelIds = null;

        const result = await svc().getBoard({
          channel: explicitChannel,
          roundKey: rk,
          source: source ? String(source) : undefined,
          channelIds,
        });
        ctx.body = wrap(result);
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },
  };
};