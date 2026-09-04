import type Koa from "koa";
import type { Core } from "@strapi/strapi";
import type {
  AuthService,
  AuthUser,
} from "../utils/types";
import bcrypt from "bcryptjs";

const USER_UID = "plugin::users-permissions.user";

const UP_USERS_TABLE = "up_users";

// C 端懒对齐：SSO 已建 sso_user，但 C 端 up_users 未必有对应行。
// 认证到 token 里的 sso_id 时，确保 up_users 存在同 id 行并补齐对齐字段。
// 用 knex 直写（up_users 的 sso_id/nickname/avatar/invite_code 未在 users-permissions schema 声明，
// Strapi query 会过滤这些列），与 SSO 域彻底解耦——SSO 只管 sso_users，C 端只碰 up_users。
async function alignUpUser(strapi: Core.Strapi, ssoId: number, decoded: Record<string, any>) {
  const knex = strapi.db.connection;
  try {
    const exist = await knex(UP_USERS_TABLE)
      .select("id", "sso_id", "username", "nickname", "avatar", "invite_code")
      .where({ id: ssoId })
      .first();

    const nickname = decoded.nickname || null;
    const avatar = decoded.avatar || null;

    if (exist) {
      const patch: Record<string, any> = {};
      if (exist.sso_id == null) patch.sso_id = ssoId;
      // 昵称/头像仅缺时回填，且不覆盖非 wx_ 占位的手设昵称
      if (nickname && !exist.nickname && !exist.username?.startsWith("wx_")) patch.nickname = nickname;
      if (avatar && !exist.avatar) patch.avatar = avatar;
      // 兜底邀请码：SSO 未给 ownInviteCode 时本地生成
      if (!exist.invite_code) {
        patch.invite_code = `U${ssoId}`;
      }
      if (Object.keys(patch).length) {
        patch.updated_at = new Date();
        await knex(UP_USERS_TABLE).where({ id: ssoId }).update(patch);
      }
      return exist;
    }

    // 不存在：经原生 SQL 补建（同名逻辑与原 SSO ensureUpUser 一致，现在归属 C 端）
    const rows = await knex(UP_USERS_TABLE).insert({
      id: ssoId,
      document_id: null,
      username: nickname || `wx_${ssoId}`,
      email: decoded.email || `${ssoId}@bridge.local`,
      provider: "local",
      password: null,
      confirmed: true,
      blocked: false,
      sso_id: ssoId,
      nickname,
      avatar,
      invite_code: `U${ssoId}`,
      created_at: new Date(),
      updated_at: new Date(),
      published_at: new Date(),
    }).returning("id");
    strapi.log.info(`[zhao-auth] 懒对齐新建 up_users id=${rows?.[0] ?? ssoId} (sso_id=${ssoId})`);
    return { id: rows?.[0] ?? ssoId };
  } catch (e: any) {
    strapi.log.warn(`[zhao-auth] up_users 懒对齐失败 sso=${ssoId}: ${e?.message || e}`);
    return null;
  }
}

// SSO 开关内存缓存，TTL 5 分钟
let ssoCache: { enabled: boolean; loginUrl: string; expireAt: number } | null = null;
const SSO_CACHE_TTL = 5 * 60 * 1000;

// C 端登录后对齐：把 SSO 返回的真实邀请码/昵称/头像写入 up_users（覆盖懒对齐的 U<id> 占位符）。
// 调用时机：auth-callback 拿到 SSO user 对象（含真实 ownInviteCode）后调 /zhao-auth/v1/auth/sync-sso-profile。
async function syncSsoProfile(strapi: Core.Strapi, ssoId: number, data: {
  nickname?: string | null;
  avatar?: string | null;
  inviteCode?: string | null;
}) {
  const knex = strapi.db.connection;
  try {
    const nickname = data.nickname || null;
    const avatar = data.avatar || null;
    const inviteCode = data.inviteCode || `U${ssoId}`; // 未给真实码时降级占位
    const exist = await knex(UP_USERS_TABLE)
      .select("id", "sso_id", "nickname", "avatar", "invite_code")
      .where({ id: ssoId })
      .first();
    if (exist) {
      const patch: Record<string, any> = { updated_at: new Date() };
      if (exist.sso_id == null) patch.sso_id = ssoId;
      if (nickname || !exist.nickname) patch.nickname = nickname || exist.nickname;
      if (avatar) patch.avatar = avatar;
      if (inviteCode && (!exist.invite_code || exist.invite_code.startsWith("U"))) patch.invite_code = inviteCode;
      await knex(UP_USERS_TABLE).where({ id: ssoId }).update(patch);
    } else {
      await knex(UP_USERS_TABLE).insert({
        id: ssoId,
        document_id: null,
        username: nickname || `wx_${ssoId}`,
        email: `${ssoId}@bridge.local`,
        provider: "local",
        password: null,
        confirmed: true,
        blocked: false,
        sso_id: ssoId,
        nickname,
        avatar,
        invite_code: inviteCode,
        created_at: new Date(),
        updated_at: new Date(),
        published_at: new Date(),
      });
    }
    strapi.log.info(`[zhao-auth] syncSsoProfile sso=${ssoId} invite_code=${inviteCode}`);
    return { ssoId, inviteCode, nickname, avatar };
  } catch (e: any) {
    strapi.log.warn(`[zhao-auth] syncSsoProfile 失败 sso=${ssoId}: ${e?.message || e}`);
    return null;
  }
}

export default ({ strapi }: { strapi: Core.Strapi }): AuthService & Record<string, any> => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  const getJwtService = () => strapi.plugin("zhao-auth").service("jwt");

  const normalizeUser = (decoded: Record<string, any>): AuthUser => {
    const user: AuthUser = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      roles: [],
    };

    // 优先级：zhaoRoles > roles > role
    if (Array.isArray(decoded.zhaoRoles) && decoded.zhaoRoles.length > 0) {
      user.roles = decoded.zhaoRoles
        .map((r: any) => (typeof r === "string" ? r : r?.name || r?.type || r?.role))
        .filter((r: string) => r && r.trim() !== "");
    } else if (Array.isArray(decoded.roles) && decoded.roles.length > 0) {
      user.roles = decoded.roles
        .map((r: any) => (typeof r === "string" ? r : r?.name || r?.type || r?.role))
        .filter((r: string) => r && r.trim() !== "");
    } else if (typeof decoded.role === "string" && decoded.role.trim()) {
      user.roles = [decoded.role];
    } else if (decoded.role && typeof decoded.role === "object") {
      if (decoded.role.type) {
        user.roles = [decoded.role.type];
      } else if (decoded.role.name) {
        user.roles = [decoded.role.name];
      }
    }

    const normalizedRoles = user.roles;
    Object.assign(user, decoded);
    user.roles = normalizedRoles;

    return user;
  };

  return {
    /**
     * 验证 JWT token，返回用户信息
     * 如 JWT 中无角色信息，从数据库加载
     */
    async authenticate(token: string): Promise<AuthUser> {
      try {
        const decoded = await getJwtService().verify(token);
        const user = normalizeUser(decoded);

        if (!Array.isArray(user.roles) || user.roles.length === 0) {
          strapi.log.debug("[zhao-auth] JWT 中没有角色，从数据库加载");
          try {
            const dbUser = await strapi.db.query("plugin::users-permissions.user").findOne({
              where: { id: user.id },
              populate: ["role"],
            });

            if (dbUser) {
              // 优先从 zhaoRoles JSON 字段读取
              if (Array.isArray(dbUser.zhaoRoles) && dbUser.zhaoRoles.length > 0) {
                user.roles = dbUser.zhaoRoles
                  .map((r: any) => (typeof r === "string" ? r : r?.role || r?.name || r?.type))
                  .filter((r: string) => r && r.trim());
              } else if (dbUser.role) {
                // 回退：从 Strapi 内置 role 表读取 type 字段
                if (Array.isArray(dbUser.role)) {
                  user.roles = dbUser.role
                    .map((r: any) => r?.type)
                    .filter((type: string) => type && type.trim());
                } else if (dbUser.role.type) {
                  user.roles = [dbUser.role.type as string];
                }
              } else {
                user.roles = [];
              }
            }
            strapi.log.debug(`[zhao-auth] Loaded roles from DB for user ${user.id}: ${JSON.stringify(user.roles)}`);
          } catch (err) {
            strapi.log.error("[zhao-auth] 从数据库加载角色失败:", err);
          }
        }

        // 懒对齐：SSO token 携带 sso_id 时，确保 C 端 up_users 有同 id 行（SSO 与 C 端分离，不在 SSO 侧写库）
        if (Number.isInteger(decoded.sso_id) && decoded.sso_id > 0) {
          await alignUpUser(strapi, decoded.sso_id, decoded);
        }

        return user;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throwErr("AUTH_001", 401, `认证失败: ${message}`);
      }
    },

    /**
     * 兼容保留：策略链执行
     * 新代码应使用 Strapi 原生 config.policies 机制
     */
    async authorize(context: any, policies: any[]): Promise<any> {
      if (!policies || policies.length === 0) {
        return { passed: true };
      }
      // 委托给 permission 服务检查
      const user = context.user;
      if (!user?.id) {
        return { passed: false, code: "UNAUTHENTICATED", message: "未认证" };
      }
      return { passed: true };
    },

    extractToken(ctx: Koa.Context): string | null {
      return getJwtService().extractToken(ctx);
    },

    getUser(ctx: Koa.Context): AuthUser | null {
      return (ctx.state as { user?: AuthUser }).user || null;
    },

    /**
   * 按用户名或邮箱查找用户（注册时用）
   */
  async findUserByIdentifier(username: string, email: string) {
    return strapi.db.query(USER_UID).findOne({
      where: {
        $or: [
          { username },
          { email: email.toLowerCase() },
        ],
      },
    });
  },

  /**
   * 按用户名或邮箱查找本地认证用户（登录时用）
   */
  async findUserForLogin(identifier: string) {
    return strapi.db.query(USER_UID).findOne({
      where: {
        provider: "local",
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier },
        ],
      },
      populate: ["role"],
    });
  },

  /**
   * 创建用户
   */
  async createUser(data: { username: string; email: string; password: string }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return strapi.db.query(USER_UID).create({
      data: {
        username: data.username,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        provider: "local",
        confirmed: true,
        blocked: false,
      },
    });
  },

  /**
   * 更新用户密码
   */
  async updateUserPassword(userId: number, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return strapi.db.query(USER_UID).update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  },

  /**
   * 检查 SSO 是否启用
   *
   * 数据源优先级：
   * 1. 当前 site context 的 site-config.featureFlags.sso + extraConfig.ssoLoginUrl
   *    （前端 tenant/detail.vue 编辑的就是这两个字段，必须以此为准）
   * 2. 旧版 feature-flag 表的 sso_enabled 标记（兼容回退）
   *
   * 注意：原实现使用模块级缓存 ssoCache，但站点上下文切换后缓存会污染，
   * 已改为每次实时查询（查询本身有 Strapi 内部缓存，性能可接受）。
   */
  async isSsoEnabled(): Promise<{ enabled: boolean; loginUrl: string; appCode: string }> {
    // 1. 优先读 site-config（按当前 x-site-id 上下文）
    try {
      const siteCtx = strapi.requestContext?.get?.() as any;
      const siteId = siteCtx?.state?.siteId || siteCtx?.state?.site?.id;
      const filters: any = {};
      if (siteId) filters.id = siteId;
      const sites = await strapi.documents("plugin::zhao-common.site-config").findMany({ filters });
      const site = Array.isArray(sites) ? sites[0] : null;
      if (site) {
        const featureFlags = (site as any).featureFlags || {};
        const extraConfig = (site as any).extraConfig || {};
        if (featureFlags.sso === true) {
          const loginUrl: string =
            (extraConfig.ssoLoginUrl as string) ||
            (strapi.plugin("zhao-sso")?.config?.("loginUrl") as string) ||
            "/sso/login";
          // ssoAppCode 从 extraConfig 读取，默认 'course'
          const appCode: string = (extraConfig.ssoAppCode as string) || "course";
          return { enabled: true, loginUrl, appCode };
        }
        // site-config 显式 sso=false 时直接返回禁用，不再回退到 feature-flag
        return { enabled: false, loginUrl: "", appCode: "" };
      }
    } catch {
      // site-config 查询失败，回退到 feature-flag
    }

    // 2. 回退：旧版 feature-flag 表
    try {
      const ssoFlag = await strapi.documents("plugin::zhao-common.feature-flag").findMany({
        filters: { flagKey: "sso_enabled" },
      });
      const flag = Array.isArray(ssoFlag) ? ssoFlag[0] : null;
      if (flag && flag.flagValue === true && flag.enabled !== false) {
        const loginUrl: string = strapi.plugin("zhao-sso")?.config?.("loginUrl") as string || "/sso/login";
        return { enabled: true, loginUrl, appCode: "course" };
      }
    } catch {
      // feature-flag 查询失败，默认不启用
    }
    return { enabled: false, loginUrl: "", appCode: "" };
  },

  /**
   * 本地登录验证
   */
  async localLogin(identifier: string, password: string) {
    const user = await this.findUserForLogin(identifier);
    if (!user) {
      return { success: false, error: "账号不存在或已注销" };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return { success: false, error: "密码错误" };
    }

    if (user.blocked) {
      return { success: false, error: "账户已被锁定，请联系管理员" };
    }

    // 解析角色（优先 zhaoRoles，回退到 Strapi 内置 role.type）
    let roles: string[] = [];
    let formattedRole: any = null;
    if (Array.isArray(user.zhaoRoles) && user.zhaoRoles.length > 0) {
      roles = user.zhaoRoles
        .map((r: any) => (typeof r === "string" ? r : r?.role || r?.name || r?.type))
        .filter((r: string) => r && r.trim());
      formattedRole = roles.map((r: string) => ({ name: r, type: r }));
    } else if (user.role) {
      if (Array.isArray(user.role)) {
        roles = user.role.map((r: any) => r?.type).filter((type: string) => type && type.trim());
        formattedRole = user.role.map((r: any) => ({ id: r.id, name: r.name, type: r.type }));
      } else if (user.role.type) {
        roles = [user.role.type];
        formattedRole = { id: user.role.id, name: user.role.name, type: user.role.type };
      }
    }

    return { success: true, user, roles, formattedRole };
  },

  /**
     * 兼容保留：策略注册
     * 新代码应通过 Strapi 原生 policies 导出机制注册
     */
    registerPolicy(_name: string, _handler: any): void {
      // no-op: 策略通过 Strapi 原生机制注册
    },

    /**
     * C 端登录后对齐 up_users：写入 SSO 真实邀请码/昵称/头像（计划：SSO 返回 ownInviteCode → C 端落库）
     */
    async syncSsoProfile(ssoId: number, data: { nickname?: string | null; avatar?: string | null; inviteCode?: string | null }) {
      return syncSsoProfile(strapi, ssoId, data);
    },

  /**
   * 检查用户是否具有特定权限（委托给 permission.service.getMyPermissions）
   * 兼容 user 对象或 userId 数值
   * @param user 用户对象（含 id）或 userId 数值
   * @param action 权限 key
   * @returns 是否具有权限
   */
  async checkPermission(user: any, action: string): Promise<boolean> {
    const userId = typeof user === "object" && user !== null ? user.id : user;
    const permissions = await strapi
      .plugin("zhao-auth")
      .service("permission")
      .getMyPermissions(userId);
    return permissions.includes(action);
  },
  };
};
