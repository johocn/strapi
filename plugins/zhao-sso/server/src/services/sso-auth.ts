import type { Core } from "@strapi/strapi";

const TOKEN_UID = "plugin::zhao-sso.sso-token";
const USER_ROLE_UID = "plugin::zhao-sso.sso-user-app-role";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  const jwtService = () => strapi.plugin("zhao-sso").service("sso-jwt");
  const userService = () => strapi.plugin("zhao-sso").service("sso-user");
  const loginLogService = () => strapi.plugin("zhao-sso").service("sso-login-log");
  const inviteService = () => strapi.plugin("zhao-sso").service("sso-invite");

  /**
   * 建立分销关系（邀请码 + app_code 联合校验，含虚拟用户兜底）
   * 邀请码无效时不阻断登录，仅记录日志
   */
  const buildInviteRelation = async (
    inviteeId: number,
    inviteCode: string | undefined,
    appCode: string,
    channelCode?: string
  ) => {
    if (!inviteCode) return; // 无邀请码，跳过

    try {
      const result = await inviteService().buildReferralRelation({
        inviteeId,
        inviteCode,
        appCode,
        channelCode,
      });
      if (result.success) {
        if (!result.skip) {
          strapi.log.info(`[zhao-sso] 分销关系建立: userId=${inviteeId}, code=${inviteCode}, msg=${result.message}`);
        }
      } else {
        strapi.log.warn(`[zhao-sso] 分销关系建立失败: userId=${inviteeId}, code=${inviteCode}, msg=${result.message}`);
      }
    } catch (e: any) {
      strapi.log.warn(`[zhao-sso] 分销关系建立异常: ${e.message}`);
    }
  };

  const login = async (params: {
    type: string;
    identifier?: string;
    password?: string;
    code?: string;
    appCode: string;
    channelCode?: string;
    inviteCode?: string;
    ip?: string;
    userAgent?: string;
  }) => {
    const { type, identifier, password, code, appCode, channelCode, inviteCode, ip, userAgent } = params;

    const maxAttempts = 5;
    if (ip) {
      const failCount = await loginLogService().getRecentFailCount(ip, 5);
      if (failCount >= maxAttempts) {
        await loginLogService().log({ loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "too_many_attempts" });
        throwErr("SSO_AUTH_001", 429, "登录失败次数过多，请30分钟后重试");
      }
    }

    if (type === "password") {
      if (!identifier || !password) throwErr("SSO_AUTH_002", 400, "identifier 和 password 必填");

      const user = await userService().findByIdentifier(identifier);
      if (!user) {
        await loginLogService().log({ loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "user_not_found" });
        throwErr("SSO_AUTH_003", 401, "用户名/邮箱/手机号或密码错误");
      }

      if (await userService().isBlocked(user)) {
        await loginLogService().log({ userId: user.id, loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "user_blocked" });
        throwErr("SSO_AUTH_004", 403, "账号已被封禁");
      }

      const valid = await userService().verifyPassword(user, password);
      if (!valid) {
        await loginLogService().log({ userId: user.id, loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "wrong_password" });
        throwErr("SSO_AUTH_003", 401, "用户名/邮箱/手机号或密码错误");
      }

      await userService().updateLoginInfo(user.id, channelCode);
      const roles = await getUserRoles(user.id, appCode);
      const tokenPair = await jwtService().signTokenPair({
        sub: user.uuid,
        app_code: appCode,
        roles,
        channel: channelCode,
      });

      await saveTokenRecord(user.id, appCode, tokenPair, channelCode);

      await loginLogService().log({ userId: user.id, loginType: type, channelCode, appCode, ip, userAgent, success: true });

      // 建立分销关系（邀请码无效不阻断登录）
      await buildInviteRelation(user.id, inviteCode, appCode, channelCode);

      return {
        ...tokenPair,
        user: sanitizeUser(user),
      };
    }

    if (type === "sms") {
      if (!identifier || !code) throwErr("SSO_AUTH_002", 400, "identifier(mobile) 和 code 必填");

      // 校验验证码
      const smsService = strapi.plugin("zhao-sso").service("sso-sms");
      await smsService.verifyCode(identifier, code, "login");

      const user = await userService().findByIdentifier(identifier);
      if (!user) {
        await loginLogService().log({ loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "user_not_found" });
        throwErr("SSO_AUTH_003", 401, "手机号未注册");
      }

      if (await userService().isBlocked(user)) {
        await loginLogService().log({ userId: user.id, loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "user_blocked" });
        throwErr("SSO_AUTH_004", 403, "账号已被封禁");
      }

      await userService().updateLoginInfo(user.id, channelCode);
      const roles = await getUserRoles(user.id, appCode);
      const tokenPair = await jwtService().signTokenPair({
        sub: user.uuid,
        app_code: appCode,
        roles,
        channel: channelCode,
      });

      await saveTokenRecord(user.id, appCode, tokenPair, channelCode);

      await loginLogService().log({ userId: user.id, loginType: type, channelCode, appCode, ip, userAgent, success: true });

      // 建立分销关系（邀请码无效不阻断登录）
      await buildInviteRelation(user.id, inviteCode, appCode, channelCode);

      return {
        ...tokenPair,
        user: sanitizeUser(user),
      };
    }

    throwErr("SSO_AUTH_005", 400, `不支持的登录类型: ${type}`);
  };

  const register = async (params: {
    username?: string;
    mobile?: string;
    email?: string;
    password?: string;
    appCode: string;
    channelCode?: string;
    inviteCode?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    ip?: string;
    userAgent?: string;
  }) => {
    const { appCode, channelCode, inviteCode, utmSource, utmMedium, utmCampaign } = params;

    const user = await userService().createUser({
      username: params.username,
      mobile: params.mobile,
      email: params.email,
      password: params.password,
      register_channel: channelCode,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      invite_code_used: inviteCode,
    });

    const roles = await getUserRoles(user.id, appCode);
    const tokenPair = await jwtService().signTokenPair({
      sub: user.uuid,
      app_code: appCode,
      roles,
      channel: channelCode,
    });

    await saveTokenRecord(user.id, appCode, tokenPair, channelCode);

    await loginLogService().log({
      userId: user.id,
      loginType: "register",
      channelCode,
      appCode,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
    });

    // 建立分销关系（邀请码无效不阻断登录）
    await buildInviteRelation(user.id, inviteCode, appCode, channelCode);

    return {
      ...tokenPair,
      user: sanitizeUser(user),
    };
  };

  const verifyToken = async (token: string) => {
    const payload = await jwtService().verifyToken(token);
    if (payload.type !== "access") throwErr("SSO_AUTH_006", 401, "无效的 access token");

    const tokenRecord = await strapi.db.query(TOKEN_UID).findOne({
      where: { access_token_jti: payload.jti },
    });
    if (tokenRecord?.revoked) throwErr("SSO_AUTH_007", 401, "Token 已被撤销");

    const user = await userService().findByUuid(payload.sub);
    if (!user) throwErr("SSO_AUTH_008", 404, "用户不存在");
    if (await userService().isBlocked(user)) throwErr("SSO_AUTH_004", 403, "账号已被封禁");

    return { payload, user: sanitizeUser(user) };
  };

  const refreshToken = async (refreshToken: string) => {
    const payload = await jwtService().verifyToken(refreshToken);
    if (payload.type !== "refresh") throwErr("SSO_AUTH_009", 401, "无效的 refresh token");

    const tokenRecord = await strapi.db.query(TOKEN_UID).findOne({
      where: { refresh_token: refreshToken },
    });
    if (!tokenRecord) throwErr("SSO_AUTH_010", 404, "Token 记录不存在");
    if (tokenRecord.revoked) throwErr("SSO_AUTH_011", 401, "Refresh token 已被撤销");
    if (new Date(tokenRecord.refresh_expires_at) < new Date()) throwErr("SSO_AUTH_012", 401, "Refresh token 已过期");

    // 校验 app 是否允许 refresh_token 授权（payload.app_code 来自原 access token 签发时写入）
    const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
    const app = await oauthService.findApp(payload.app_code);
    if (!app || !app.is_active) throwErr("SSO_OAUTH_001", 404, "应用不存在或已禁用");
    if (!oauthService.validateGrantType(app, "refresh_token")) throwErr("SSO_OAUTH_008", 400, "该应用未开启 refresh_token 授权");

    await strapi.db.query(TOKEN_UID).update({
      where: { id: tokenRecord.id },
      data: { revoked: true, revoked_at: new Date() },
    });

    const user = await userService().findByUuid(payload.sub);
    if (!user) throwErr("SSO_AUTH_008", 404, "用户不存在");

    const roles = await getUserRoles(user.id, payload.app_code);
    const newTokenPair = await jwtService().signTokenPair({
      sub: user.uuid,
      app_code: payload.app_code,
      roles,
      channel: payload.channel,
    });

    await saveTokenRecord(user.id, payload.app_code, newTokenPair, payload.channel);

    return newTokenPair;
  };

  const logout = async (accessToken: string) => {
    const payload = await jwtService().verifyToken(accessToken);
    const tokenRecord = await strapi.db.query(TOKEN_UID).findOne({
      where: { access_token_jti: payload.jti },
    });
    if (tokenRecord && !tokenRecord.revoked) {
      await strapi.db.query(TOKEN_UID).update({
        where: { id: tokenRecord.id },
        data: { revoked: true, revoked_at: new Date() },
      });
    }
    return { success: true };
  };

  const getUserRoles = async (userId: number, appCode: string): Promise<string[]> => {
    const roles = await strapi.db.query(USER_ROLE_UID).findMany({
      where: { user: { id: userId }, app_code: appCode },
    });
    return roles.map((r: any) => r.role);
  };

  const saveTokenRecord = async (userId: number, appCode: string, tokenPair: any, channelCode?: string) => {
    const accessPayload = await jwtService().verifyToken(tokenPair.access_token);
    const refreshPayload = await jwtService().verifyToken(tokenPair.refresh_token);

    await strapi.db.query(TOKEN_UID).create({
      data: {
        user: { id: userId },
        app_code: appCode,
        access_token_jti: accessPayload.jti,
        refresh_token: tokenPair.refresh_token,
        refresh_expires_at: new Date(refreshPayload.exp * 1000),
        channel_code: channelCode || null,
      },
    });
  };

  const sanitizeUser = (user: any) => {
    const { password_hash, ...safe } = user;
    void password_hash;
    return safe;
  };

  return { login, register, verifyToken, refreshToken, logout, getUserRoles, saveTokenRecord, sanitizeUser };
};
