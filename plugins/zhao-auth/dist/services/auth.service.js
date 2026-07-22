"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const USER_UID = "plugin::users-permissions.user";
// SSO 开关内存缓存，TTL 5 分钟
let ssoCache = null;
const SSO_CACHE_TTL = 5 * 60 * 1000;
exports.default = ({ strapi }) => {
    function throwErr(code, status, message) {
        const e = new Error(message);
        e.code = code;
        e.status = status;
        throw e;
    }
    const getJwtService = () => strapi.plugin("zhao-auth").service("jwt");
    const normalizeUser = (decoded) => {
        const user = {
            id: decoded.id,
            email: decoded.email,
            username: decoded.username,
            roles: [],
        };
        // 优先级：zhaoRoles > roles > role
        if (Array.isArray(decoded.zhaoRoles) && decoded.zhaoRoles.length > 0) {
            user.roles = decoded.zhaoRoles
                .map((r) => (typeof r === "string" ? r : r?.name || r?.type || r?.role))
                .filter((r) => r && r.trim() !== "");
        }
        else if (Array.isArray(decoded.roles) && decoded.roles.length > 0) {
            user.roles = decoded.roles
                .map((r) => (typeof r === "string" ? r : r?.name || r?.type || r?.role))
                .filter((r) => r && r.trim() !== "");
        }
        else if (typeof decoded.role === "string" && decoded.role.trim()) {
            user.roles = [decoded.role];
        }
        else if (decoded.role && typeof decoded.role === "object") {
            if (decoded.role.type) {
                user.roles = [decoded.role.type];
            }
            else if (decoded.role.name) {
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
        async authenticate(token) {
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
                                    .map((r) => (typeof r === "string" ? r : String(r)))
                                    .filter((r) => r && r.trim());
                            }
                            else if (dbUser.role) {
                                // 回退：从 Strapi 内置 role 表读取 type 字段
                                if (Array.isArray(dbUser.role)) {
                                    user.roles = dbUser.role
                                        .map((r) => r?.type)
                                        .filter((type) => type && type.trim());
                                }
                                else if (dbUser.role.type) {
                                    user.roles = [dbUser.role.type];
                                }
                            }
                            else {
                                user.roles = [];
                            }
                        }
                        strapi.log.debug(`[zhao-auth] Loaded roles from DB for user ${user.id}: ${JSON.stringify(user.roles)}`);
                    }
                    catch (err) {
                        strapi.log.error("[zhao-auth] 从数据库加载角色失败:", err);
                    }
                }
                return user;
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                throwErr("AUTH_001", 401, `认证失败: ${message}`);
            }
        },
        /**
         * 兼容保留：策略链执行
         * 新代码应使用 Strapi 原生 config.policies 机制
         */
        async authorize(context, policies) {
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
        extractToken(ctx) {
            return getJwtService().extractToken(ctx);
        },
        getUser(ctx) {
            return ctx.state.user || null;
        },
        /**
       * 按用户名或邮箱查找用户（注册时用）
       */
        async findUserByIdentifier(username, email) {
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
        async findUserForLogin(identifier) {
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
        async createUser(data) {
            const hashedPassword = await bcryptjs_1.default.hash(data.password, 10);
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
        async updateUserPassword(userId, newPassword) {
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
            return strapi.db.query(USER_UID).update({
                where: { id: userId },
                data: { password: hashedPassword },
            });
        },
        /**
         * 检查 SSO 是否启用
         */
        async isSsoEnabled() {
            // 命中缓存直接返回
            if (ssoCache && Date.now() < ssoCache.expireAt) {
                return { enabled: ssoCache.enabled, loginUrl: ssoCache.loginUrl };
            }
            try {
                const ssoFlag = await strapi.documents("plugin::zhao-common.feature-flag").findMany({
                    filters: { flagKey: "sso_enabled" },
                });
                const flag = Array.isArray(ssoFlag) ? ssoFlag[0] : null;
                if (flag && flag.flagValue === true && flag.enabled !== false) {
                    const loginUrl = strapi.plugin("zhao-sso")?.config?.("loginUrl") || "/sso/login";
                    ssoCache = { enabled: true, loginUrl, expireAt: Date.now() + SSO_CACHE_TTL };
                    return { enabled: true, loginUrl };
                }
            }
            catch {
                // feature-flag 查询失败，默认不启用
            }
            ssoCache = { enabled: false, loginUrl: "", expireAt: Date.now() + SSO_CACHE_TTL };
            return { enabled: false, loginUrl: "" };
        },
        /**
         * 本地登录验证
         */
        async localLogin(identifier, password) {
            const user = await this.findUserForLogin(identifier);
            if (!user) {
                return { success: false, error: "Invalid identifier or password" };
            }
            const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
            if (!isValidPassword) {
                return { success: false, error: "Invalid identifier or password" };
            }
            if (user.blocked) {
                return { success: false, error: "账户已被锁定" };
            }
            // 解析角色（优先 zhaoRoles，回退到 Strapi 内置 role.type）
            let roles = [];
            let formattedRole = null;
            if (Array.isArray(user.zhaoRoles) && user.zhaoRoles.length > 0) {
                roles = user.zhaoRoles
                    .map((r) => (typeof r === "string" ? r : String(r)))
                    .filter((r) => r && r.trim());
                formattedRole = roles.map((r) => ({ name: r, type: r }));
            }
            else if (user.role) {
                if (Array.isArray(user.role)) {
                    roles = user.role.map((r) => r?.type).filter((type) => type && type.trim());
                    formattedRole = user.role.map((r) => ({ id: r.id, name: r.name, type: r.type }));
                }
                else if (user.role.type) {
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
        registerPolicy(_name, _handler) {
            // no-op: 策略通过 Strapi 原生机制注册
        },
    };
};
