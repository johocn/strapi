import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async me(ctx: any) {
    try {
      const ssoUser = ctx.state.ssoUser;
      if (!ssoUser) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }

      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const user = await userService.findByUuid(ssoUser.sub);
      if (!user) {
        ctx.status = 404;
        ctx.body = { error: "用户不存在" };
        return;
      }

      // 附加本人自有邀请码（sso_invite_codes.creator=本人 的活跃码）
      // 供 Vendure sso 认证链把本地 referralCode 与 SSO 自有码对齐（四层同码）。
      // 无则懒生成保证恒有值；多 app 码时优先 vendure-youshop，无则 course 兜底。
      let ownInviteCode = "";
      try {
        const inviteSvc = strapi.plugin("zhao-sso").service("sso-invite");
        if (inviteSvc) {
          const q = strapi.db.query("plugin::zhao-sso.sso-invite-code");
          const pref = await q.findOne({ where: { creator: user.id, app_code: "vendure-youshop", is_active: true } });
          const anyActive = pref || (await q.findOne({ where: { creator: user.id, is_active: true } }));
          ownInviteCode = pref?.code || anyActive?.code || "";
          if (!ownInviteCode && inviteSvc.ensureOwnInviteCode) {
            ownInviteCode = (await inviteSvc.ensureOwnInviteCode(user.id, "vendure-youshop")) || "";
          }
        }
      } catch (e: any) {
        strapi.log.warn(`[user-controller] 获取 ownInviteCode 失败: ${e?.message || e}`);
      }

      ctx.body = { ...user, ownInviteCode };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async bind(ctx: any) {
    try {
      const ssoUser = ctx.state.ssoUser;
      if (!ssoUser) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }

      const body = ctx.request.body?.data || ctx.request.body;
      const { type, identifier, password, provider_data } = body;
      const userService = strapi.plugin("zhao-sso").service("sso-user");

      const user = await userService.findByUuid(ssoUser.sub);
      if (!user) {
        ctx.status = 404;
        ctx.body = { error: "用户不存在" };
        return;
      }

      if (type === "mobile" || type === "email" || type === "username") {
        await userService.bindContact(user.id, type, identifier, password);
        ctx.body = { success: true, message: `已绑定 ${type}` };
        return;
      }

      if (type === "third_party" && provider_data) {
        await userService.bindThirdParty(user.id, provider_data);
        ctx.body = { success: true, message: "已绑定第三方账号" };
        return;
      }

      ctx.status = 400; ctx.body = { error: "不支持的绑定类型" };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async unbind(ctx: any) {
    try {
      const ssoUser = ctx.state.ssoUser;
      if (!ssoUser) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }

      const body = ctx.request.body?.data || ctx.request.body;
      const { provider } = body;
      if (!provider) { ctx.status = 400; ctx.body = { error: "provider 必填" }; return; }

      const user = await strapi.plugin("zhao-sso").service("sso-user").findByUuid(ssoUser.sub);
      if (!user) {
        ctx.status = 404;
        ctx.body = { error: "用户不存在" };
        return;
      }

      await strapi.plugin("zhao-sso").service("sso-user").unbindThirdParty(user.id, provider);
      ctx.body = { success: true };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async changePassword(ctx: any) {
    try {
      const ssoUser = ctx.state.ssoUser;
      if (!ssoUser) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }

      const body = ctx.request.body?.data || ctx.request.body;
      const { old_password, new_password } = body;
      if (!old_password || !new_password) { ctx.status = 400; ctx.body = { error: "old_password 和 new_password 必填" }; return; }

      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const user = await userService.findByUuid(ssoUser.sub);
      if (!user) {
        ctx.status = 404;
        ctx.body = { error: "用户不存在" };
        return;
      }

      const valid = await userService.verifyPassword(user, old_password);
      if (!valid) { ctx.status = 400; ctx.body = { error: "旧密码错误" }; return; }

      await userService.changePassword(user.id, new_password);
      ctx.body = { success: true };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  /** 自助修改本人昵称（个人中心入口） */
  async updateProfile(ctx: any) {
    try {
      const ssoUser = ctx.state.ssoUser;
      if (!ssoUser) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }

      const body = ctx.request.body?.data || ctx.request.body;
      const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
      if (!nickname) { ctx.status = 400; ctx.body = { error: "昵称不能为空" }; return; }

      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const user = await userService.findByUuid(ssoUser.sub);
      if (!user) {
        ctx.status = 404;
        ctx.body = { error: "用户不存在" };
        return;
      }

      ctx.body = await userService.updateNickname(user.id, nickname);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },
});
