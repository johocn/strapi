import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async register(ctx: any) {
    try {
      const { username, email, password, inviteCode } = ctx.request.body;

      if (!username || !email || !password) {
        ctx.status = 400; ctx.body = { error: "请提供 username, email 和 password" }; return;
      }

      if (password.length < 6) {
        ctx.status = 400; ctx.body = { error: "密码长度至少6位" }; return;
      }

      const authService = strapi.plugin("zhao-auth").service("auth");
      const existingUser = await authService.findUserByIdentifier(username, email);

      if (existingUser) {
        if (existingUser.username === username) {
          ctx.status = 400; ctx.body = { error: "用户名已存在" }; return;
        }
        ctx.status = 400; ctx.body = { error: "邮箱已被注册" }; return;
      }

      const user = await authService.createUser({ username, email, password });

      let inviteInfo = null;
      try {
        const channelService = strapi.service("plugin::zhao-channel.user-invite");
        if (channelService && typeof channelService.createForUser === "function") {
          inviteInfo = await channelService.createForUser(user.id, inviteCode);
        }
      } catch (e) {
        strapi.log.warn(`[zhao-auth] 创建邀请码失败: ${(e as Error).message}`);
      }

      const jwtService = strapi.plugin("zhao-auth").service("jwt");
      const jwt = await jwtService.sign({ id: user.id, email: user.email, username: user.username, zhaoRoles: ["user"] });

      ctx.status = 201;
      ctx.body = {
        jwt,
        user: { id: user.id, username: user.username, email: user.email },
        inviteInfo: inviteInfo
          ? strapi.service("plugin::zhao-channel.user-invite")?.formatInviteInfo?.(inviteInfo) || null
          : null,
      };
    } catch (error: any) {
      strapi.log.error(`[zhao-auth] Register failed: ${error.message}`);
      ctx.status = (error as any).status || 400; ctx.body = { error: error.message };
    }
  },

  async resetPassword(ctx: any) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { identifier, password } = body;

    if (!identifier || !password) {
      ctx.status = 400; ctx.body = { error: "请提供 identifier 和 password" }; return;
    }

    if (password.length < 6) {
      ctx.status = 400; ctx.body = { error: "密码长度至少 6 位" }; return;
    }

    try {
      const authService = strapi.plugin("zhao-auth").service("auth");
      const user = await authService.findUserByIdentifier(identifier, identifier);

      if (!user) {
        ctx.status = 400; ctx.body = { error: "用户不存在" }; return;
      }

      await authService.updateUserPassword(user.id, password);
      ctx.body = { success: true, message: "密码重置成功" };
    } catch (error: any) {
      strapi.log.error(`[zhao-auth] 重置密码失败：${error.message}`);
      ctx.status = (error as any).status || 400; ctx.body = { error: "密码重置失败，请稍后重试" };
    }
  },

  async login(ctx: any) {
    try {
      const authService = strapi.plugin("zhao-auth").service("auth");

      // 检查 SSO 开关
      const sso = await authService.isSsoEnabled();
      if (sso.enabled) {
        ctx.body = { mode: "sso", sso_login_url: sso.loginUrl, message: "SSO 认证已启用，请通过 SSO 登录" };
        return;
      }

      const { identifier, password } = ctx.request.body;
      if (!identifier || !password) {
        ctx.status = 400; ctx.body = { error: "请提供 identifier 和 password" }; return;
      }

      const result = await authService.localLogin(identifier, password);
      if (!result.success) {
        ctx.status = 400; ctx.body = { error: result.error }; return;
      }

      const { user, roles, formattedRole } = result;
      const jwtService = strapi.plugin("zhao-auth").service("jwt");
      const jwt = await jwtService.sign({ id: user.id, email: user.email, username: user.username, zhaoRoles: roles });

      // 确保用户有邀请码
      let inviteCode = null;
      try {
        const channelService = strapi.service("plugin::zhao-channel.user-invite");
        if (channelService && typeof channelService.createForUser === "function") {
          const inviteInfo = await channelService.createForUser(user.id);
          inviteCode = inviteInfo?.inviteCode || null;
        }
      } catch (e) {
        strapi.log.warn(`[zhao-auth] 登录时创建邀请码失败: ${(e as Error).message}`);
      }

      ctx.body = {
        jwt,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: formattedRole,
        },
        inviteCode,
      };
    } catch (error: any) {
      strapi.log.error(`[zhao-auth] Login failed: ${error.message}`);
      ctx.status = (error as any).status || 400; ctx.body = { error: error.message };
    }
  },

  async config(ctx: any) {
    try {
      const authService = strapi.plugin("zhao-auth").service("auth");

      // 检查SSO开关
      const sso = await authService.isSsoEnabled();

      // 检查三方登录开关（微信等）
      const thirdEnabled = await this.checkThirdPartyEnabled();

      // 决定认证模式
      let mode = "local";
      if (sso.enabled) {
        mode = "sso";
      } else if (thirdEnabled) {
        mode = "third";
      }

      ctx.body = {
        mode,
        methods: ["password", "sms"],
        ssoLoginUrl: sso.enabled ? sso.loginUrl : null,
        wechatEnabled: thirdEnabled,
        registerEnabled: true,
      };
    } catch (e) {
      strapi.log.error("[zhao-auth] Failed to get auth config:", e);
      ctx.body = {
        mode: "local",
        methods: ["password"],
        ssoLoginUrl: null,
        wechatEnabled: false,
        registerEnabled: true,
      };
    }
  },

  async checkThirdPartyEnabled(): Promise<boolean> {
    try {
      const flag = await strapi.documents("plugin::zhao-common.feature-flag").findFirst({
        filters: { flagKey: "third_party_enabled" },
      });

      return flag && flag.flagValue === true && flag.enabled !== false;
    } catch {
      return false;
    }
  },
});
