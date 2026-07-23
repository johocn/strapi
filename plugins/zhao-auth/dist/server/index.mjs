import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const USER_UID$2 = "plugin::users-permissions.user";
let ssoCache = null;
const SSO_CACHE_TTL = 5 * 60 * 1e3;
const authService = ({ strapi: strapi2 }) => {
  function throwErr2(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  const getJwtService = () => strapi2.plugin("zhao-auth").service("jwt");
  const normalizeUser = (decoded) => {
    const user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      roles: []
    };
    if (Array.isArray(decoded.zhaoRoles) && decoded.zhaoRoles.length > 0) {
      user.roles = decoded.zhaoRoles.map((r) => typeof r === "string" ? r : r?.name || r?.type || r?.role).filter((r) => r && r.trim() !== "");
    } else if (Array.isArray(decoded.roles) && decoded.roles.length > 0) {
      user.roles = decoded.roles.map((r) => typeof r === "string" ? r : r?.name || r?.type || r?.role).filter((r) => r && r.trim() !== "");
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
    async authenticate(token) {
      try {
        const decoded = await getJwtService().verify(token);
        const user = normalizeUser(decoded);
        if (!Array.isArray(user.roles) || user.roles.length === 0) {
          strapi2.log.debug("[zhao-auth] JWT 中没有角色，从数据库加载");
          try {
            const dbUser = await strapi2.db.query("plugin::users-permissions.user").findOne({
              where: { id: user.id },
              populate: ["role"]
            });
            if (dbUser) {
              if (Array.isArray(dbUser.zhaoRoles) && dbUser.zhaoRoles.length > 0) {
                user.roles = dbUser.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((r) => r && r.trim());
              } else if (dbUser.role) {
                if (Array.isArray(dbUser.role)) {
                  user.roles = dbUser.role.map((r) => r?.type).filter((type) => type && type.trim());
                } else if (dbUser.role.type) {
                  user.roles = [dbUser.role.type];
                }
              } else {
                user.roles = [];
              }
            }
            strapi2.log.debug(`[zhao-auth] Loaded roles from DB for user ${user.id}: ${JSON.stringify(user.roles)}`);
          } catch (err) {
            strapi2.log.error("[zhao-auth] 从数据库加载角色失败:", err);
          }
        }
        return user;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throwErr2("AUTH_001", 401, `认证失败: ${message}`);
      }
    },
    /**
     * 兼容保留：策略链执行
     * 新代码应使用 Strapi 原生 config.policies 机制
     */
    async authorize(context, policies2) {
      if (!policies2 || policies2.length === 0) {
        return { passed: true };
      }
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
      return strapi2.db.query(USER_UID$2).findOne({
        where: {
          $or: [
            { username },
            { email: email.toLowerCase() }
          ]
        }
      });
    },
    /**
     * 按用户名或邮箱查找本地认证用户（登录时用）
     */
    async findUserForLogin(identifier) {
      return strapi2.db.query(USER_UID$2).findOne({
        where: {
          provider: "local",
          $or: [
            { email: identifier.toLowerCase() },
            { username: identifier }
          ]
        },
        populate: ["role"]
      });
    },
    /**
     * 创建用户
     */
    async createUser(data) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      return strapi2.db.query(USER_UID$2).create({
        data: {
          username: data.username,
          email: data.email.toLowerCase(),
          password: hashedPassword,
          provider: "local",
          confirmed: true,
          blocked: false
        }
      });
    },
    /**
     * 更新用户密码
     */
    async updateUserPassword(userId, newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      return strapi2.db.query(USER_UID$2).update({
        where: { id: userId },
        data: { password: hashedPassword }
      });
    },
    /**
     * 检查 SSO 是否启用
     */
    async isSsoEnabled() {
      if (ssoCache && Date.now() < ssoCache.expireAt) {
        return { enabled: ssoCache.enabled, loginUrl: ssoCache.loginUrl };
      }
      try {
        const ssoFlag = await strapi2.documents("plugin::zhao-common.feature-flag").findMany({
          filters: { flagKey: "sso_enabled" }
        });
        const flag = Array.isArray(ssoFlag) ? ssoFlag[0] : null;
        if (flag && flag.flagValue === true && flag.enabled !== false) {
          const loginUrl = strapi2.plugin("zhao-sso")?.config?.("loginUrl") || "/sso/login";
          ssoCache = { enabled: true, loginUrl, expireAt: Date.now() + SSO_CACHE_TTL };
          return { enabled: true, loginUrl };
        }
      } catch {
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
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return { success: false, error: "Invalid identifier or password" };
      }
      if (user.blocked) {
        return { success: false, error: "账户已被锁定" };
      }
      let roles = [];
      let formattedRole = null;
      if (Array.isArray(user.zhaoRoles) && user.zhaoRoles.length > 0) {
        roles = user.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((r) => r && r.trim());
        formattedRole = roles.map((r) => ({ name: r, type: r }));
      } else if (user.role) {
        if (Array.isArray(user.role)) {
          roles = user.role.map((r) => r?.type).filter((type) => type && type.trim());
          formattedRole = user.role.map((r) => ({ id: r.id, name: r.name, type: r.type }));
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
    registerPolicy(_name, _handler) {
    },
    /**
     * 检查用户是否具有特定权限（委托给 permission.service.getMyPermissions）
     * 兼容 user 对象或 userId 数值
     * @param user 用户对象（含 id）或 userId 数值
     * @param action 权限 key
     * @returns 是否具有权限
     */
    async checkPermission(user, action) {
      const userId = typeof user === "object" && user !== null ? user.id : user;
      const permissions2 = await strapi2.plugin("zhao-auth").service("permission").getMyPermissions(userId);
      return permissions2.includes(action);
    }
  };
};
const jwtService = ({ strapi: strapi2 }) => {
  function throwErr2(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  let cachedSecret = null;
  const getSecret = () => {
    if (cachedSecret) return cachedSecret;
    const isValidSecret = (secret) => typeof secret === "string" && secret.trim() !== "";
    try {
      const apiJwt = strapi2.config.get("plugin::users-permissions.jwtSecret");
      if (isValidSecret(apiJwt)) {
        cachedSecret = apiJwt;
        return cachedSecret;
      }
    } catch {
    }
    try {
      const adminJwt = strapi2.config.get("admin.auth.secret");
      if (isValidSecret(adminJwt)) {
        cachedSecret = adminJwt;
        return cachedSecret;
      }
    } catch {
    }
    const envJwt = process.env.JWT_SECRET;
    if (isValidSecret(envJwt)) {
      cachedSecret = envJwt;
      return cachedSecret;
    }
    throwErr2(
      "JWT_001",
      500,
      "JWT secret not configured. Set JWT_SECRET env or configure users-permissions plugin."
    );
  };
  const refreshSecret = () => {
    cachedSecret = null;
  };
  const extractToken = (ctx) => {
    const authHeader = ctx.request?.headers?.authorization || ctx.headers?.authorization;
    if (!authHeader || typeof authHeader !== "string") return null;
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;
    return parts[1];
  };
  return {
    async verify(token, secret, options2) {
      const resolvedSecret = secret || getSecret();
      return jwt.verify(token, resolvedSecret, options2);
    },
    async sign(payload, options2) {
      const secret = getSecret();
      const signOptions = { expiresIn: "30d", ...options2 };
      return jwt.sign(payload, secret, signOptions);
    },
    getSecret,
    extractToken,
    refreshSecret
    // 可选暴露，便于测试
  };
};
const ROLES = {
  ADMIN: "admin",
  CHANNEL_ADMIN: "channel-admin",
  PLUGIN_MANAGER: "plugin-manager",
  INSTRUCTOR: "instructor",
  USER: "user",
  // 11 个中心 × 2 = 22 个新角色
  WEBSITE_MANAGER: "website-manager",
  WEBSITE_EDITOR: "website-editor",
  LOGISTICS_MANAGER: "logistics-manager",
  LOGISTICS_EDITOR: "logistics-editor",
  COURSE_MANAGER: "course-manager",
  COURSE_EDITOR: "course-editor",
  STUDY_MANAGER: "study-manager",
  STUDY_EDITOR: "study-editor",
  QUIZ_MANAGER: "quiz-manager",
  QUIZ_EDITOR: "quiz-editor",
  POINT_MANAGER: "point-manager",
  POINT_EDITOR: "point-editor",
  MARKETING_MANAGER: "marketing-manager",
  MARKETING_EDITOR: "marketing-editor",
  SYSTEM_MANAGER: "system-manager",
  SYSTEM_EDITOR: "system-editor",
  TAG_MANAGER: "tag-manager",
  TAG_EDITOR: "tag-editor",
  STUDIO_MANAGER: "studio-manager",
  STUDIO_EDITOR: "studio-editor",
  WEALTH_MANAGER: "wealth-manager",
  WEALTH_EDITOR: "wealth-editor"
};
const MODULE_MANAGER_MAP = {
  website: ROLES.WEBSITE_MANAGER,
  logistics: ROLES.LOGISTICS_MANAGER,
  studio: ROLES.STUDIO_MANAGER,
  points: ROLES.POINT_MANAGER,
  course: ROLES.COURSE_MANAGER,
  quiz: ROLES.QUIZ_MANAGER,
  sso: ROLES.SYSTEM_MANAGER,
  thirdParty: ROLES.SYSTEM_MANAGER,
  oss: ROLES.SYSTEM_MANAGER
};
const ROLE_LABELS = {
  [ROLES.ADMIN]: "系统管理员",
  [ROLES.CHANNEL_ADMIN]: "渠道管理员",
  [ROLES.PLUGIN_MANAGER]: "插件管理员",
  [ROLES.INSTRUCTOR]: "讲师",
  [ROLES.USER]: "普通用户",
  [ROLES.WEBSITE_MANAGER]: "官网管理员",
  [ROLES.WEBSITE_EDITOR]: "官网编辑",
  [ROLES.LOGISTICS_MANAGER]: "物流管理员",
  [ROLES.LOGISTICS_EDITOR]: "物流编辑",
  [ROLES.COURSE_MANAGER]: "课程管理员",
  [ROLES.COURSE_EDITOR]: "课程编辑",
  [ROLES.STUDY_MANAGER]: "学习数据管理员",
  [ROLES.STUDY_EDITOR]: "学习数据编辑",
  [ROLES.QUIZ_MANAGER]: "题库管理员",
  [ROLES.QUIZ_EDITOR]: "题库编辑",
  [ROLES.POINT_MANAGER]: "积分管理员",
  [ROLES.POINT_EDITOR]: "积分编辑",
  [ROLES.MARKETING_MANAGER]: "营销管理员",
  [ROLES.MARKETING_EDITOR]: "营销编辑",
  [ROLES.SYSTEM_MANAGER]: "系统管理员(中心)",
  [ROLES.SYSTEM_EDITOR]: "系统编辑",
  [ROLES.TAG_MANAGER]: "标签管理员",
  [ROLES.TAG_EDITOR]: "标签编辑",
  [ROLES.STUDIO_MANAGER]: "工作室管理员",
  [ROLES.STUDIO_EDITOR]: "工作室编辑",
  [ROLES.WEALTH_MANAGER]: "理财管理员",
  [ROLES.WEALTH_EDITOR]: "理财编辑"
};
const PERMISSION_TREE = {
  "auth": {
    label: "认证权限",
    type: "menu",
    children: {
      "auth.admin-login": { label: "后台登录", type: "button" }
    }
  },
  "menu.course-center": {
    label: "课程中心",
    type: "menu",
    children: {
      "menu.course": {
        label: "课程管理",
        type: "menu",
        children: {
          "course.read": { label: "查看课程", type: "button" },
          "course.create": { label: "新增课程", type: "button" },
          "course.update": { label: "编辑课程", type: "button" },
          "course.publish": { label: "发布课程", type: "button" },
          "course.delete": { label: "删除课程", type: "button" }
        }
      },
      "menu.lesson": {
        label: "课时管理",
        type: "menu",
        children: {
          "lesson.read": { label: "查看课时", type: "button" },
          "lesson.create": { label: "新增课时", type: "button" },
          "lesson.update": { label: "编辑课时", type: "button" },
          "lesson.delete": { label: "删除课时", type: "button" }
        }
      },
      "menu.category": {
        label: "课程分类",
        type: "menu",
        children: {
          "course-category.read": { label: "查看分类", type: "button" },
          "course-category.create": { label: "新增分类", type: "button" },
          "course-category.update": { label: "编辑分类", type: "button" },
          "course-category.delete": { label: "删除分类", type: "button" }
        }
      },
      "menu.auth": {
        label: "用户授权",
        type: "menu",
        children: {
          "user-course.read": { label: "查看授权", type: "button" },
          "user-course.grant": { label: "授权管理", type: "button" }
        }
      }
    }
  },
  "menu.study-center": {
    label: "学习数据",
    type: "menu",
    children: {
      "menu.progress": {
        label: "课程进度",
        type: "menu",
        children: {
          "course-progress.read": { label: "查看课程进度", type: "button" },
          "course-progress.update": { label: "更新课程进度", type: "button" }
        }
      },
      "menu.lesson-progress": {
        label: "课时进度",
        type: "menu",
        children: {
          "lesson-progress.read": { label: "查看课时进度", type: "button" },
          "lesson-progress.update": { label: "更新课时进度", type: "button" }
        }
      }
    }
  },
  "menu.quiz-center": {
    label: "题库系统",
    type: "menu",
    children: {
      "menu.quiz": {
        label: "题库管理",
        type: "menu",
        children: {
          "quiz.read": { label: "查看题目", type: "button" },
          "quiz.create": { label: "新增题目", type: "button" },
          "quiz.update": { label: "编辑题目", type: "button" },
          "quiz.delete": { label: "删除题目", type: "button" }
        }
      },
      "menu.exam": {
        label: "考试管理",
        type: "menu",
        children: {
          "exam.read": { label: "查看考试", type: "button" },
          "exam.create": { label: "新增考试", type: "button" },
          "exam.update": { label: "编辑考试", type: "button" },
          "exam.delete": { label: "删除考试", type: "button" },
          "quiz.exam-attempt.read": { label: "查看考试记录", type: "button" },
          "quiz.exam-attempt.delete": { label: "删除考试记录", type: "button" }
        }
      },
      "menu.quiz-record": {
        label: "答题记录",
        type: "menu",
        children: {
          "quiz-record.read": { label: "查看答题记录", type: "button" }
        }
      },
      "menu.quiz-batch": {
        label: "批量考试",
        type: "menu",
        children: {
          "quiz.quiz-batch.read": { label: "查看", type: "button" },
          "quiz.quiz-batch.create": { label: "创建", type: "button" },
          "quiz.quiz-batch.delete": { label: "删除", type: "button" }
        }
      }
    }
  },
  "menu.point-center": {
    label: "积分体系",
    type: "menu",
    children: {
      "menu.point-type": {
        label: "积分类型",
        type: "menu",
        children: {
          "point-type.read": { label: "查看积分类型", type: "button" },
          "point-type.create": { label: "新增积分类型", type: "button" },
          "point-type.update": { label: "编辑积分类型", type: "button" },
          "point-type.delete": { label: "删除积分类型", type: "button" }
        }
      },
      "menu.point-rule": {
        label: "积分规则",
        type: "menu",
        children: {
          "point-rule.read": { label: "查看规则", type: "button" },
          "point-rule.create": { label: "新增规则", type: "button" },
          "point-rule.update": { label: "编辑规则", type: "button" },
          "point-rule.delete": { label: "删除规则", type: "button" }
        }
      },
      "menu.point-record": {
        label: "积分记录",
        type: "menu",
        children: {
          "point-record.read": { label: "查看记录", type: "button" }
        }
      },
      "menu.product": {
        label: "积分产品",
        type: "menu",
        children: {
          "point-product.read": { label: "查看产品", type: "button" },
          "point-product.create": { label: "新增产品", type: "button" },
          "point-product.update": { label: "编辑产品", type: "button" },
          "point-product.delete": { label: "删除产品", type: "button" }
        }
      },
      "menu.exchange": {
        label: "兑换记录",
        type: "menu",
        children: {
          "point-exchange.read": { label: "查看兑换", type: "button" }
        }
      },
      "menu.point-stat": {
        label: "积分统计",
        type: "menu",
        children: {
          "point-dashboard.read": { label: "查看统计", type: "button" }
        }
      },
      "menu.point-config": {
        label: "积分配置",
        type: "menu",
        children: {
          "point-config.read": { label: "查看配置", type: "button" },
          "point-config.update": { label: "修改配置", type: "button" }
        }
      },
      "menu.pickup-location": {
        label: "自提点",
        type: "menu",
        children: {
          "pickup-location.read": { label: "查看自提点", type: "button" },
          "pickup-location.create": { label: "新增自提点", type: "button" },
          "pickup-location.update": { label: "编辑自提点", type: "button" },
          "pickup-location.delete": { label: "删除自提点", type: "button" }
        }
      },
      "menu.point-verification": {
        label: "积分核销",
        type: "menu",
        children: {
          "point-verification.read": { label: "查看核销记录", type: "button" }
        }
      },
      "menu.point-rule-template": {
        label: "规则模板",
        type: "menu",
        children: {
          "point.rule-template.read": { label: "查看", type: "button" },
          "point.rule-template.create": { label: "创建", type: "button" },
          "point.rule-template.update": { label: "编辑", type: "button" },
          "point.rule-template.delete": { label: "删除", type: "button" }
        }
      },
      "menu.point-sign-in": {
        label: "签到记录",
        type: "menu",
        children: {
          "point.sign-in-record.read": { label: "查看", type: "button" },
          "point.sign-in-record.export": { label: "导出", type: "button" }
        }
      }
    }
  },
  "menu.marketing-center": {
    label: "营销运营",
    type: "menu",
    children: {
      "menu.channel": {
        label: "渠道管理",
        type: "menu",
        children: {
          "channel.read": { label: "查看渠道", type: "button" },
          "channel.create": { label: "新增渠道", type: "button" },
          "channel.update": { label: "编辑渠道", type: "button" },
          "channel.delete": { label: "删除渠道", type: "button" },
          "channel.config.update": { label: "修改渠道配置", type: "button" }
        }
      },
      "menu.network": {
        label: "渠道网络",
        type: "menu",
        children: {
          "network.view": { label: "查看网络", type: "button" }
        }
      },
      "menu.members": {
        label: "成员管理",
        type: "menu",
        children: {
          "channel-member.read": { label: "查看成员", type: "button" },
          "channel-member.add": { label: "邀请成员", type: "button" },
          "channel-member.remove": { label: "移除成员", type: "button" }
        }
      },
      "menu.invite": {
        label: "分销邀请",
        type: "menu",
        children: {
          "user-invite.send": { label: "创建邀请", type: "button" },
          "user-invite.validate": { label: "使用邀请", type: "button" }
        }
      },
      "menu.channel-permission": {
        label: "渠道权限",
        type: "menu",
        children: {
          "channel-permission.set": { label: "授权渠道", type: "button" },
          "channel.user-channel.read": { label: "查看用户渠道", type: "button" },
          "channel.user-channel.assign": { label: "分配渠道", type: "button" },
          "channel.user-channel.revoke": { label: "撤销渠道", type: "button" }
        }
      },
      "menu.redemption-code": {
        label: "兑换码",
        type: "menu",
        children: {
          "redemption-code.create": { label: "创建兑换码", type: "button" },
          "redemption-code.delete": { label: "删除兑换码", type: "button" }
        }
      },
      "menu.redemption-record": {
        label: "兑换记录",
        type: "menu",
        children: {
          "redemption-record.review": { label: "审核兑换", type: "button" }
        }
      }
    }
  },
  "menu.system-center": {
    label: "系统工具",
    type: "menu",
    children: {
      "menu.media": {
        label: "媒体资源",
        type: "menu",
        children: {
          "oss.media-meta.read": { label: "查看媒体", type: "button" },
          "oss.media-meta.upload": { label: "上传媒体", type: "button" },
          "oss.media-meta.delete": { label: "删除媒体", type: "button" }
        }
      },
      "menu.soft-delete": {
        label: "回收站",
        type: "menu",
        children: {
          "soft-delete.read": { label: "查看回收站", type: "button" },
          "soft-delete.manage": { label: "管理回收站", type: "button" }
        }
      },
      "menu.feature-flag": {
        label: "功能开关",
        type: "menu",
        children: {
          "feature-flag.update": { label: "修改粗粒度开关", type: "button" },
          "config.feature.update": { label: "修改细粒度配置", type: "button" }
        }
      },
      "menu.site-config": {
        label: "站点配置",
        type: "menu",
        children: {
          "config.read": { label: "查看配置", type: "button" },
          "config.create": { label: "新增配置", type: "button" },
          "config.update": { label: "修改配置", type: "button" },
          "config.delete": { label: "删除配置", type: "button" },
          "site-config.update": { label: "修改站点配置", type: "button" }
        }
      },
      "menu.verification": { label: "验证记录", type: "menu" },
      "menu.user-roles": {
        label: "用户角色",
        type: "menu",
        children: {
          "role.assign": { label: "分配角色", type: "button" },
          "role.revoke": { label: "撤销角色", type: "button" },
          "role.create": { label: "新增角色", type: "button" },
          "role.read": { label: "查看角色", type: "button" },
          "role.read-logs": { label: "查看角色日志", type: "button" }
        }
      },
      "menu.global-config": {
        label: "全局配置",
        type: "menu",
        children: {
          "global-config.read": { label: "查看全局配置", type: "button" },
          "global-config.update": { label: "修改全局配置", type: "button" }
        }
      },
      "menu.module-visibility": {
        label: "模块可见性配置",
        type: "menu",
        children: {}
      },
      "menu.permissions": {
        label: "权限管理",
        type: "menu",
        children: {
          "permissions.read": { label: "查看权限", type: "button" },
          "permissions.update": { label: "更新权限", type: "button" }
        }
      },
      "menu.role-logs": { label: "操作日志", type: "menu" },
      "menu.oss": {
        label: "OSS 管理",
        type: "menu",
        children: {
          "oss.read": { label: "查看 OSS", type: "button" },
          "oss.upload": { label: "上传文件", type: "button" },
          "oss.delete": { label: "删除文件", type: "button" },
          "oss.dashboard": { label: "查看仪表盘", type: "button" },
          "oss.record": { label: "查看同步记录", type: "button" },
          "oss.settings": { label: "修改存储设置", type: "button" }
        }
      },
      "menu.third": {
        label: "三方配置",
        type: "menu",
        children: {
          "third-party-config.read": { label: "查看配置", type: "button" },
          "third-party-config.create": { label: "新增配置", type: "button" },
          "third-party-config.update": { label: "编辑配置", type: "button" },
          "third-party-config.delete": { label: "删除配置", type: "button" },
          "third-party-account.read": { label: "查看绑定账号", type: "button" },
          "third-party-account.delete": { label: "解绑账号", type: "button" }
        }
      },
      "menu.sso": {
        label: "SSO 管理",
        type: "menu",
        children: {
          "sso.dashboard": { label: "查看仪表盘", type: "button" },
          "sso.user-read": { label: "查看用户", type: "button" },
          "sso.user-update": { label: "编辑用户", type: "button" },
          "sso.app-read": { label: "查看应用", type: "button" },
          "sso.app-create": { label: "创建应用", type: "button" },
          "sso.app-update": { label: "编辑应用", type: "button" },
          "sso.channel-read": { label: "查看渠道", type: "button" },
          "sso.channel-create": { label: "创建渠道", type: "button" },
          "sso.channel-update": { label: "编辑渠道", type: "button" },
          "sso.log-read": { label: "查看日志", type: "button" },
          "menu.sso-binding": {
            label: "三方绑定",
            type: "menu",
            children: {
              "sso.third-party-binding.read": { label: "查看三方绑定", type: "button" },
              "sso.third-party-binding.create": { label: "创建绑定", type: "button" },
              "sso.third-party-binding.update": { label: "编辑绑定", type: "button" },
              "sso.third-party-binding.delete": { label: "删除绑定", type: "button" },
              "sso.oauth-config.read": { label: "查看OAuth配置", type: "button" },
              "sso.oauth-config.create": { label: "创建OAuth配置", type: "button" },
              "sso.oauth-config.update": { label: "编辑OAuth配置", type: "button" },
              "sso.oauth-config.delete": { label: "删除OAuth配置", type: "button" }
            }
          },
          "menu.sso-token": {
            label: "令牌管理",
            type: "menu",
            children: {
              "sso.token.read": { label: "查看令牌", type: "button" },
              "sso.token.delete": { label: "删除令牌", type: "button" },
              "sso.auth-code.read": { label: "查看授权码", type: "button" },
              "sso.auth-code.delete": { label: "删除授权码", type: "button" }
            }
          },
          "menu.sso-user-role": {
            label: "用户应用角色",
            type: "menu",
            children: {
              "sso.user-app-role.read": { label: "查看角色", type: "button" },
              "sso.user-app-role.create": { label: "分配角色", type: "button" },
              "sso.user-app-role.update": { label: "编辑角色", type: "button" },
              "sso.user-app-role.delete": { label: "删除角色", type: "button" }
            }
          },
          "menu.sso-invite": {
            label: "邀请体系",
            type: "menu",
            children: {
              "sso.invite-code.read": { label: "查看邀请码", type: "button" },
              "sso.invite-code.create": { label: "创建邀请码", type: "button" },
              "sso.invite-code.delete": { label: "删除邀请码", type: "button" },
              "sso.invite-code.validate": { label: "核销邀请码", type: "button" },
              "sso.invite-usage.read": { label: "查看使用记录", type: "button" },
              "sso.invite-usage.delete": { label: "删除使用记录", type: "button" },
              "sso.invite-stats.read": { label: "查看邀请统计", type: "button" },
              "sso.referral-relation.read": { label: "查看推荐关系", type: "button" },
              "sso.referral-relation.delete": { label: "删除推荐关系", type: "button" }
            }
          },
          "menu.sso-sms": {
            label: "短信验证",
            type: "menu",
            children: {
              "sso.sms-code.read": { label: "查看短信码", type: "button" },
              "sso.sms-code.delete": { label: "删除短信码", type: "button" }
            }
          }
        }
      },
      "menu.tenant": {
        label: "租户管理",
        type: "menu",
        children: {
          "tenant.read": { label: "查看租户", type: "button" },
          "tenant.create": { label: "新建租户", type: "button" },
          "tenant.update": { label: "编辑租户", type: "button" },
          "tenant.delete": { label: "删除租户", type: "button" }
        }
      },
      "menu.template": {
        label: "模板管理",
        type: "menu",
        children: {
          "template.read": { label: "查看模板", type: "button" },
          "template.create": { label: "新增模板", type: "button" },
          "template.update": { label: "编辑模板", type: "button" },
          "template.delete": { label: "删除模板", type: "button" }
        }
      }
    }
  },
  "menu.tag-center": {
    label: "标签体系",
    type: "menu",
    children: {
      "menu.tag": {
        label: "标签管理",
        type: "menu",
        children: {
          "tag.read": { label: "查看标签", type: "button" },
          "tag.create": { label: "新增标签", type: "button" },
          "tag.update": { label: "编辑标签", type: "button" },
          "tag.delete": { label: "删除标签", type: "button" }
        }
      },
      "menu.tag-group": {
        label: "分组管理",
        type: "menu",
        children: {
          "tag-group.read": { label: "查看分组", type: "button" },
          "tag-group.create": { label: "新增分组", type: "button" },
          "tag-group.update": { label: "编辑分组", type: "button" },
          "tag-group.delete": { label: "删除分组", type: "button" }
        }
      },
      "menu.knowledge": {
        label: "知识点",
        type: "menu",
        children: {
          "knowledge-point.read": { label: "查看知识点", type: "button" },
          "knowledge-point.create": { label: "新增知识点", type: "button" },
          "knowledge-point.update": { label: "编辑知识点", type: "button" },
          "knowledge-point.delete": { label: "删除知识点", type: "button" }
        }
      },
      "menu.tag-preset": { label: "分类预设", type: "menu" },
      "menu.tag-search": { label: "全局检索", type: "menu" },
      "menu.tag-index": {
        label: "标签索引",
        type: "menu",
        children: {
          "tag.tag-index.read": { label: "查看", type: "button" },
          "tag.tag-index.create": { label: "创建", type: "button" },
          "tag.tag-index.update": { label: "编辑", type: "button" },
          "tag.tag-index.delete": { label: "删除", type: "button" }
        }
      }
    }
  },
  "menu.studio-center": {
    label: "直播工作室",
    type: "menu",
    children: {
      "menu.studio": {
        label: "工作室管理",
        type: "menu",
        children: {
          "zhao-studio.read": { label: "查看工作室", type: "button" },
          "zhao-studio.create": { label: "新增工作室", type: "button" },
          "zhao-studio.update": { label: "编辑工作室", type: "button" },
          "zhao-studio.delete": { label: "删除工作室", type: "button" }
        }
      },
      "menu.studio-collect": {
        label: "内容采集",
        type: "menu",
        children: {
          "studio.article-draft.read": { label: "查看文章草稿", type: "button" },
          "studio.article-draft.create": { label: "创建草稿", type: "button" },
          "studio.article-draft.update": { label: "编辑草稿", type: "button" },
          "studio.article-draft.delete": { label: "删除草稿", type: "button" },
          "studio.collect-source.read": { label: "查看采集源", type: "button" },
          "studio.collect-source.create": { label: "创建采集源", type: "button" },
          "studio.collect-source.update": { label: "编辑采集源", type: "button" },
          "studio.collect-source.delete": { label: "删除采集源", type: "button" },
          "studio.collect-task.read": { label: "查看采集任务", type: "button" },
          "studio.collect-task.create": { label: "创建采集任务", type: "button" },
          "studio.collect-task.update": { label: "编辑采集任务", type: "button" },
          "studio.collect-task.delete": { label: "删除采集任务", type: "button" },
          "studio.knowledge-point-index.read": { label: "查看知识索引", type: "button" },
          "studio.knowledge-point-index.create": { label: "创建知识索引", type: "button" },
          "studio.knowledge-point-index.update": { label: "编辑知识索引", type: "button" },
          "studio.knowledge-point-index.delete": { label: "删除知识索引", type: "button" }
        }
      },
      "menu.studio-publish": {
        label: "多平台发布",
        type: "menu",
        children: {
          "studio.publish-platform.read": { label: "查看发布平台", type: "button" },
          "studio.publish-platform.create": { label: "创建发布平台", type: "button" },
          "studio.publish-platform.update": { label: "编辑发布平台", type: "button" },
          "studio.publish-platform.delete": { label: "删除发布平台", type: "button" },
          "studio.publish-account.read": { label: "查看发布账号", type: "button" },
          "studio.publish-account.create": { label: "创建发布账号", type: "button" },
          "studio.publish-account.update": { label: "编辑发布账号", type: "button" },
          "studio.publish-account.delete": { label: "删除发布账号", type: "button" },
          "studio.publish-record.read": { label: "查看发布记录", type: "button" },
          "studio.publish-record.delete": { label: "删除发布记录", type: "button" }
        }
      },
      "menu.studio-stats": {
        label: "数据分析",
        type: "menu",
        children: {
          "studio.stat-summary.read": { label: "查看统计", type: "button" },
          "studio.stat-summary.export": { label: "导出统计", type: "button" },
          "studio.browser-log.read": { label: "查看浏览日志", type: "button" },
          "studio.browser-log.export": { label: "导出浏览日志", type: "button" },
          "zhao-studio.stat-summary.view": { label: "查看统计摘要", type: "button" }
        }
      },
      "menu.studio-ad": {
        label: "广告位",
        type: "menu",
        children: {
          "studio.ad-slot.read": { label: "查看广告位", type: "button" },
          "studio.ad-slot.create": { label: "创建广告位", type: "button" },
          "studio.ad-slot.update": { label: "编辑广告位", type: "button" },
          "studio.ad-slot.delete": { label: "删除广告位", type: "button" }
        }
      },
      "menu.studio-sync-event": {
        label: "同步事件",
        type: "menu",
        children: {
          "sync-event.read": { label: "查看同步事件", type: "button" },
          "sync-event.update": { label: "处理同步事件", type: "button" },
          "sync-event.manage": { label: "同步事件管理", type: "button" }
        }
      },
      "promo-channel": {
        label: "推广渠道",
        type: "menu",
        children: {
          "zhao-studio.promo-channel.manage": { label: "管理", type: "button" },
          "zhao-studio.promo-channel.archive": { label: "归档", type: "button" }
        }
      },
      "promo-campaign": {
        label: "营销活动",
        type: "menu",
        children: {
          "zhao-studio.promo-campaign.manage": { label: "管理", type: "button" }
        }
      },
      "ab-experiment": {
        label: "AB实验",
        type: "menu",
        children: {
          "zhao-studio.ab-experiment.manage": { label: "管理", type: "button" },
          "zhao-studio.ab-experiment.start": { label: "启动", type: "button" },
          "zhao-studio.ab-experiment.stop": { label: "停止", type: "button" }
        }
      },
      "channel-report": {
        label: "渠道报表",
        type: "menu",
        children: {
          "zhao-studio.channel-report.view": { label: "查看", type: "button" }
        }
      }
    }
  },
  "menu.website-center": {
    label: "官网中心",
    type: "menu",
    children: {
      "menu.website-seo": {
        label: "SEO 配置",
        type: "menu",
        children: {
          "seo-config.read": { label: "查看 SEO", type: "button" },
          "seo-config.update": { label: "编辑 SEO", type: "button" }
        }
      },
      "menu.website-brand": {
        label: "品牌信息",
        type: "menu",
        children: {
          "brand-info.read": { label: "查看品牌", type: "button" },
          "brand-info.update": { label: "编辑品牌", type: "button" }
        }
      },
      "menu.website-article": {
        label: "文章管理",
        type: "menu",
        children: {
          "article.read": { label: "查看文章", type: "button" },
          "article.create": { label: "新增文章", type: "button" },
          "article.update": { label: "编辑文章", type: "button" },
          "article.delete": { label: "删除文章", type: "button" },
          "article.publish": { label: "发布文章", type: "button" }
        }
      },
      "menu.website-article-category": {
        label: "文章分类",
        type: "menu",
        children: {
          "article-category.read": { label: "查看分类", type: "button" },
          "article-category.create": { label: "新增分类", type: "button" },
          "article-category.update": { label: "编辑分类", type: "button" },
          "article-category.delete": { label: "删除分类", type: "button" }
        }
      },
      "menu.website-product": {
        label: "产品管理",
        type: "menu",
        children: {
          "product.read": { label: "查看产品", type: "button" },
          "product.create": { label: "新增产品", type: "button" },
          "product.update": { label: "编辑产品", type: "button" },
          "product.delete": { label: "删除产品", type: "button" }
        }
      },
      "menu.website-case": {
        label: "案例管理",
        type: "menu",
        children: {
          "case.read": { label: "查看案例", type: "button" },
          "case.create": { label: "新增案例", type: "button" },
          "case.update": { label: "编辑案例", type: "button" },
          "case.delete": { label: "删除案例", type: "button" }
        }
      },
      "menu.website-compliance": {
        label: "合规公示",
        type: "menu",
        children: {
          "compliance.read": { label: "查看合规", type: "button" },
          "compliance.create": { label: "新增合规", type: "button" },
          "compliance.update": { label: "编辑合规", type: "button" },
          "compliance.delete": { label: "删除合规", type: "button" }
        }
      },
      "menu.website-faq": {
        label: "FAQ 管理",
        type: "menu",
        children: {
          "faq.read": { label: "查看 FAQ", type: "button" },
          "faq.create": { label: "新增 FAQ", type: "button" },
          "faq.update": { label: "编辑 FAQ", type: "button" },
          "faq.delete": { label: "删除 FAQ", type: "button" }
        }
      },
      "menu.website-tutorial": {
        label: "教程管理",
        type: "menu",
        children: {
          "tutorial.read": { label: "查看教程", type: "button" },
          "tutorial.create": { label: "新增教程", type: "button" },
          "tutorial.update": { label: "编辑教程", type: "button" },
          "tutorial.delete": { label: "删除教程", type: "button" }
        }
      },
      "menu.website-download": {
        label: "下载管理",
        type: "menu",
        children: {
          "download.read": { label: "查看下载", type: "button" },
          "download.create": { label: "新增下载", type: "button" },
          "download.update": { label: "编辑下载", type: "button" },
          "download.delete": { label: "删除下载", type: "button" }
        }
      },
      "menu.website-lead": {
        label: "线索管理",
        type: "menu",
        children: {
          "lead.read": { label: "查看线索", type: "button" },
          "lead.update": { label: "更新线索", type: "button" },
          "lead.delete": { label: "删除线索", type: "button" }
        }
      },
      "menu.website-visit-log": {
        label: "访问日志",
        type: "menu",
        children: {
          "visit-log.read": { label: "查看日志", type: "button" },
          "visit-log.delete": { label: "删除日志", type: "button" }
        }
      },
      "menu.website-interaction": {
        label: "互动记录",
        type: "menu",
        children: {
          "interaction.read": { label: "查看互动", type: "button" },
          "interaction.delete": { label: "删除互动", type: "button" }
        }
      },
      "menu.website-search-log": {
        label: "搜索日志",
        type: "menu",
        children: {
          "search-log.read": { label: "查看搜索日志", type: "button" },
          "search-log.delete": { label: "删除搜索日志", type: "button" }
        }
      },
      "menu.website-knowledge-entity": {
        label: "知识实体",
        type: "menu",
        children: {
          "knowledge-entity.read": { label: "查看实体", type: "button" },
          "knowledge-entity.create": { label: "新增实体", type: "button" },
          "knowledge-entity.update": { label: "编辑实体", type: "button" },
          "knowledge-entity.delete": { label: "删除实体", type: "button" },
          "knowledge-entity.manage": { label: "实体管理", type: "button" },
          "knowledge-entity.create-global": { label: "新增全局实体", type: "button" },
          "knowledge-entity.update-global": { label: "编辑全局实体", type: "button" },
          "knowledge-entity.delete-global": { label: "删除全局实体", type: "button" }
        }
      },
      "menu.website-knowledge-relation": {
        label: "知识关系",
        type: "menu",
        children: {
          "knowledge-relation.read": { label: "查看关系", type: "button" },
          "knowledge-relation.create": { label: "新增关系", type: "button" },
          "knowledge-relation.update": { label: "编辑关系", type: "button" },
          "knowledge-relation.delete": { label: "删除关系", type: "button" }
        }
      },
      "menu.website-ai-summary": {
        label: "AI 摘要",
        type: "menu",
        children: {
          "ai-summary.read": { label: "查看摘要", type: "button" },
          "ai-summary.create": { label: "新增摘要", type: "button" },
          "ai-summary.update": { label: "编辑摘要", type: "button" },
          "ai-summary.delete": { label: "删除摘要", type: "button" }
        }
      },
      "menu.website-first-truth": {
        label: "第一真值",
        type: "menu",
        children: {
          "first-truth.read": { label: "查看真值", type: "button" },
          "first-truth.create": { label: "新增真值", type: "button" },
          "first-truth.update": { label: "编辑真值", type: "button" },
          "first-truth.delete": { label: "删除真值", type: "button" },
          "first-truth.manage": { label: "真值管理", type: "button" },
          "first-truth.create-global": { label: "新增全局真值", type: "button" },
          "first-truth.update-global": { label: "编辑全局真值", type: "button" },
          "first-truth.delete-global": { label: "删除全局真值", type: "button" }
        }
      },
      "menu.website-brand-voice": {
        label: "品牌话术",
        type: "menu",
        children: {
          "brand-voice.read": { label: "查看话术", type: "button" },
          "brand-voice.create": { label: "新增话术", type: "button" },
          "brand-voice.update": { label: "编辑话术", type: "button" },
          "brand-voice.delete": { label: "删除话术", type: "button" },
          "brand-voice.create-global": { label: "新增全局话术", type: "button" },
          "brand-voice.update-global": { label: "编辑全局话术", type: "button" },
          "brand-voice.delete-global": { label: "删除全局话术", type: "button" }
        }
      }
    }
  },
  "menu.logistics-center": {
    label: "物流中心",
    type: "menu",
    children: {
      "menu.logistics-quote": {
        label: "询价管理",
        type: "menu",
        children: {
          "logistics.quote-request.read": { label: "查看询价单", type: "button" },
          "logistics.quote-request.create": { label: "新增询价单", type: "button" },
          "logistics.quote-request.update": { label: "编辑询价单", type: "button" },
          "logistics.quote-request.delete": { label: "删除询价单", type: "button" },
          "logistics.quote-field-rule.read": { label: "查看字段规则", type: "button" },
          "logistics.quote-field-rule.create": { label: "新增字段规则", type: "button" },
          "logistics.quote-field-rule.update": { label: "编辑字段规则", type: "button" },
          "logistics.quote-field-rule.delete": { label: "删除字段规则", type: "button" },
          "logistics.quote-price-rule.read": { label: "查看报价规则", type: "button" },
          "logistics.quote-price-rule.create": { label: "新增报价规则", type: "button" },
          "logistics.quote-price-rule.update": { label: "编辑报价规则", type: "button" },
          "logistics.quote-price-rule.delete": { label: "删除报价规则", type: "button" },
          "logistics.quote-price-formula.read": { label: "查看报价公式", type: "button" },
          "logistics.quote-price-formula.create": { label: "新增公式", type: "button" },
          "logistics.quote-price-formula.update": { label: "编辑公式", type: "button" },
          "logistics.quote-price-formula.delete": { label: "删除公式", type: "button" }
        }
      },
      "menu.logistics-tracking": {
        label: "货物追踪",
        type: "menu",
        children: {
          "logistics.tracking-shipment.read": { label: "查看运单", type: "button" },
          "logistics.tracking-shipment.create": { label: "新增运单", type: "button" },
          "logistics.tracking-shipment.update": { label: "编辑运单", type: "button" },
          "logistics.tracking-shipment.delete": { label: "删除运单", type: "button" },
          "logistics.tracking-node.read": { label: "查看追踪节点", type: "button" },
          "logistics.tracking-node.create": { label: "新增节点", type: "button" },
          "logistics.tracking-node.update": { label: "编辑节点", type: "button" },
          "logistics.tracking-node.delete": { label: "删除节点", type: "button" },
          "logistics.tracking-provider.read": { label: "查看追踪配置", type: "button" },
          "logistics.tracking-provider.create": { label: "新增追踪配置", type: "button" },
          "logistics.tracking-provider.update": { label: "编辑追踪配置", type: "button" },
          "logistics.tracking-provider.delete": { label: "删除追踪配置", type: "button" }
        }
      },
      "menu.logistics-contact": {
        label: "联系渠道",
        type: "menu",
        children: {
          "logistics.contact-matrix.read": { label: "查看渠道矩阵", type: "button" },
          "logistics.contact-matrix.create": { label: "新增渠道矩阵", type: "button" },
          "logistics.contact-matrix.update": { label: "编辑渠道矩阵", type: "button" },
          "logistics.contact-matrix.delete": { label: "删除渠道矩阵", type: "button" }
        }
      },
      "menu.logistics-review": {
        label: "客户评价",
        type: "menu",
        children: {
          "logistics.review.read": { label: "查看评价", type: "button" },
          "logistics.review.create": { label: "新增评价", type: "button" },
          "logistics.review.update": { label: "编辑评价", type: "button" },
          "logistics.review.delete": { label: "删除评价", type: "button" },
          "logistics.review.approve": { label: "审核评价", type: "button" }
        }
      },
      "menu.logistics-subscription": {
        label: "通知订阅",
        type: "menu",
        children: {
          "logistics.subscription.read": { label: "查看订阅", type: "button" },
          "logistics.subscription.update": { label: "更新订阅", type: "button" },
          "logistics.subscription.delete": { label: "删除订阅", type: "button" }
        }
      },
      "menu.logistics-landing": {
        label: "落地页",
        type: "menu",
        children: {
          "logistics.landing-page.read": { label: "查看落地页", type: "button" },
          "logistics.landing-page.create": { label: "新增落地页", type: "button" },
          "logistics.landing-page.update": { label: "编辑落地页", type: "button" },
          "logistics.landing-page.delete": { label: "删除落地页", type: "button" }
        }
      },
      "menu.logistics-funnel": {
        label: "转化漏斗",
        type: "menu",
        children: {
          "logistics.conversion-funnel.read": { label: "查看漏斗", type: "button" },
          "logistics.conversion-funnel.create": { label: "新增漏斗", type: "button" },
          "logistics.conversion-funnel.update": { label: "编辑漏斗", type: "button" },
          "logistics.conversion-funnel.delete": { label: "删除漏斗", type: "button" },
          "logistics.conversion-event.read": { label: "查看事件", type: "button" },
          "logistics.funnel-stats.read": { label: "查看漏斗统计", type: "button" }
        }
      },
      "menu.logistics-order": {
        label: "意向订单",
        type: "menu",
        children: {
          "logistics.intent-order.read": { label: "查看订单", type: "button" },
          "logistics.intent-order.create": { label: "新增订单", type: "button" },
          "logistics.intent-order.update": { label: "编辑订单", type: "button" },
          "logistics.intent-order.delete": { label: "删除订单", type: "button" },
          "logistics.intent-order.convert": { label: "标记转化", type: "button" }
        }
      },
      "menu.logistics-referral": {
        label: "推荐奖励",
        type: "menu",
        children: {
          "logistics.referral.read": { label: "查看推荐", type: "button" },
          "logistics.referral.create": { label: "新增推荐", type: "button" },
          "logistics.referral.update": { label: "编辑推荐", type: "button" },
          "logistics.referral.delete": { label: "删除推荐", type: "button" },
          "logistics.referral-stats.read": { label: "查看推荐统计", type: "button" }
        }
      },
      "menu.logistics-customer": {
        label: "客户档案",
        type: "menu",
        children: {
          "logistics.customer-profile.read": { label: "查看档案", type: "button" },
          "logistics.customer-profile.update": { label: "编辑档案", type: "button" },
          "logistics.customer-profile.delete": { label: "删除档案", type: "button" },
          "logistics.customer-profile.merge": { label: "合并档案", type: "button" }
        }
      }
    }
  },
  // ===== 理财中心 =====
  "menu.wealth-center": {
    label: "理财中心",
    type: "menu",
    children: {
      "menu.wealth-product": {
        label: "产品管理",
        type: "menu",
        children: {
          "wealth.wealth-product.read": { label: "查看", type: "button" },
          "wealth.wealth-product.create": { label: "创建", type: "button" },
          "wealth.wealth-product.update": { label: "编辑", type: "button" },
          "wealth.wealth-product.delete": { label: "删除", type: "button" },
          "wealth.wealth-product.collect": { label: "采集", type: "button" },
          "wealth.wealth-nav.read": { label: "查看净值", type: "button" },
          "wealth.wealth-nav.create": { label: "录入净值", type: "button" },
          "wealth.wealth-nav.update": { label: "编辑净值", type: "button" },
          "wealth.wealth-nav.delete": { label: "删除净值", type: "button" }
        }
      },
      "menu.wealth-company": {
        label: "公司管理",
        type: "menu",
        children: {
          "wealth.wealth-company.read": { label: "查看", type: "button" },
          "wealth.wealth-company.create": { label: "创建", type: "button" },
          "wealth.wealth-company.update": { label: "编辑", type: "button" },
          "wealth.wealth-company.delete": { label: "删除", type: "button" }
        }
      },
      "menu.wealth-collect": {
        label: "数据采集",
        type: "menu",
        children: {
          "wealth.wealth-collect-config.read": { label: "查看配置", type: "button" },
          "wealth.wealth-collect-config.create": { label: "创建配置", type: "button" },
          "wealth.wealth-collect-config.update": { label: "编辑配置", type: "button" },
          "wealth.wealth-collect-config.delete": { label: "删除配置", type: "button" },
          "wealth.wealth-collect-config.trigger": { label: "触发采集", type: "button" },
          "wealth.wealth-customer-product.read": { label: "查看持仓", type: "button" },
          "wealth.wealth-customer-product.create": { label: "录入持仓", type: "button" },
          "wealth.wealth-customer-product.delete": { label: "删除持仓", type: "button" }
        }
      },
      "menu.wealth-metrics": {
        label: "风险指标",
        type: "menu",
        children: {
          "wealth.wealth-risk-metric.read": { label: "查看风险", type: "button" },
          "wealth.wealth-risk-metric.update": { label: "编辑风险", type: "button" },
          "wealth.wealth-risk-metric.aggregate": { label: "聚合统计", type: "button" },
          "wealth.wealth-risk-metric.trend": { label: "趋势分析", type: "button" },
          "wealth.wealth-risk-metric.peers": { label: "同业对比", type: "button" },
          "wealth.wealth-risk-metric.recalculate": { label: "重算指标", type: "button" },
          "wealth.wealth-recommend-config.read": { label: "查看推荐配置", type: "button" },
          "wealth.wealth-recommend-config.create": { label: "创建推荐配置", type: "button" },
          "wealth.wealth-recommend-config.update": { label: "编辑推荐配置", type: "button" },
          "wealth.wealth-recommend-config.delete": { label: "删除推荐配置", type: "button" },
          "wealth.wealth-annual-snapshot.read": { label: "查看年报", type: "button" },
          "wealth.wealth-annual-snapshot.update": { label: "编辑年报", type: "button" },
          "wealth.wealth-yearly-return.read": { label: "查看年化收益", type: "button" },
          "wealth.wealth-yearly-return.update": { label: "编辑年化收益", type: "button" },
          "wealth.wealth-money-income.read": { label: "查看收益分配", type: "button" },
          "wealth.wealth-money-income.update": { label: "编辑收益分配", type: "button" }
        }
      }
    }
  },
  // ===== 新增：三插件权限子树 =====
  "zhao-deal": {
    label: "优惠券分销",
    type: "menu",
    children: {
      "platform": {
        label: "平台管理",
        type: "menu",
        children: {
          "zhao-deal.platform.manage": { label: "管理", type: "button" }
        }
      },
      "category": {
        label: "分类管理",
        type: "menu",
        children: {
          "zhao-deal.category.manage": { label: "管理", type: "button" }
        }
      },
      "coupon": {
        label: "优惠券",
        type: "menu",
        children: {
          "zhao-deal.coupon.manage": { label: "管理", type: "button" },
          "zhao-deal.coupon.view": { label: "查看", type: "button" },
          "zhao-deal.coupon.approve": { label: "审批", type: "button" }
        }
      },
      "coupon-collection": {
        label: "券集合",
        type: "menu",
        children: {
          "zhao-deal.coupon-collection.manage": { label: "管理", type: "button" },
          "zhao-deal.coupon-collection.publish": { label: "发布", type: "button" }
        }
      },
      "coupon-candidate": {
        label: "候选券",
        type: "menu",
        children: {
          "zhao-deal.coupon-candidate.manage": { label: "管理", type: "button" },
          "zhao-deal.coupon-candidate.view": { label: "查看", type: "button" },
          "zhao-deal.coupon-candidate.approve": { label: "审批", type: "button" }
        }
      },
      "product": {
        label: "商品",
        type: "menu",
        children: {
          "zhao-deal.product.manage": { label: "管理", type: "button" },
          "zhao-deal.product.view": { label: "查看", type: "button" }
        }
      },
      "product-candidate": {
        label: "候选商品",
        type: "menu",
        children: {
          "zhao-deal.product-candidate.manage": { label: "管理", type: "button" },
          "zhao-deal.product-candidate.view": { label: "查看", type: "button" },
          "zhao-deal.product-candidate.approve": { label: "审批", type: "button" }
        }
      },
      "sync": {
        label: "同步",
        type: "menu",
        children: {
          "zhao-deal.sync.trigger": { label: "触发", type: "button" }
        }
      }
    }
  },
  "zhao-track": {
    label: "追踪",
    type: "menu",
    children: {
      "source-tag": {
        label: "来源标签",
        type: "menu",
        children: {
          "zhao-track.source-tag.manage": { label: "管理", type: "button" }
        }
      },
      "click-event": {
        label: "点击事件",
        type: "menu",
        children: {
          "zhao-track.click-event.manage": { label: "管理", type: "button" },
          "zhao-track.click-event.view": { label: "查看", type: "button" }
        }
      },
      "order": {
        label: "订单",
        type: "menu",
        children: {
          "zhao-track.order.manage": { label: "管理", type: "button" },
          "zhao-track.order.view": { label: "查看", type: "button" }
        }
      },
      "sync": {
        label: "同步",
        type: "menu",
        children: {
          "zhao-track.sync.schedule": { label: "调度", type: "button" }
        }
      }
    }
  },
  "zhao-auth": {
    label: "认证授权",
    type: "menu",
    children: {
      "user": {
        label: "用户",
        type: "menu",
        children: {
          "zhao-auth.user.manage": { label: "管理", type: "button" }
        }
      },
      "role": {
        label: "角色",
        type: "menu",
        children: {
          "zhao-auth.role.assign": { label: "分配", type: "button" },
          "zhao-auth.role.batch-assign": { label: "批量分配", type: "button" }
        }
      },
      "permission": {
        label: "权限",
        type: "menu",
        children: {
          "matrix": {
            label: "矩阵",
            type: "menu",
            children: {
              "zhao-auth.permission.matrix.edit": { label: "编辑", type: "button" }
            }
          },
          "zhao-auth.permission.check": { label: "检查", type: "button" }
        }
      },
      "audit-log": {
        label: "审计日志",
        type: "menu",
        children: {
          "zhao-auth.audit-log.view": { label: "查看", type: "button" }
        }
      }
    }
  }
};
function flattenPermissions(tree) {
  const keys = [];
  for (const [key, item] of Object.entries(tree)) {
    keys.push(key);
    if (item.children) {
      keys.push(...flattenPermissions(item.children));
    }
  }
  return keys;
}
function centerPermissions(centerKey) {
  const center = PERMISSION_TREE[centerKey];
  if (!center?.children) return [];
  return [centerKey, ...flattenPermissions(center.children)];
}
function centerEditorPermissions(centerKey) {
  return centerPermissions(centerKey).filter(
    (k) => !k.endsWith(".delete") && !k.endsWith(".manage")
  );
}
function expandPermissionKeys$1(keys, tree = PERMISSION_TREE) {
  const expanded = /* @__PURE__ */ new Set();
  const findAndExpand = (key, nodes) => {
    for (const [k, item] of Object.entries(nodes)) {
      if (k === key) {
        expanded.add(k);
        if (item.children && item.type !== "menu") {
          flattenPermissions(item.children).forEach(
            (ck) => expanded.add(ck)
          );
        }
        return true;
      }
      if (item.children && findAndExpand(key, item.children)) {
        return true;
      }
    }
    return false;
  };
  keys.forEach((key) => findAndExpand(key, tree));
  return Array.from(expanded);
}
function getPermissionLabel(key, tree = PERMISSION_TREE) {
  for (const [k, item] of Object.entries(tree)) {
    if (k === key) return item.label;
    if (item.children) {
      const found = getPermissionLabel(key, item.children);
      if (found) return found;
    }
  }
  return null;
}
const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: flattenPermissions(PERMISSION_TREE),
  [ROLES.CHANNEL_ADMIN]: [
    // ===== 渠道管理员职责：仅渠道管理 + 成员管理 + 邀请 + 租户读取 + 站点配置创建/更新 =====
    // 不再通过 flattenPermissions(PERMISSION_TREE) 自动获得全部中心权限
    // (1) 后台登录
    "auth.admin-login",
    // (2) 渠道管理（本渠道范围内）
    "menu.marketing-center",
    "menu.channel",
    "channel.read",
    "channel.create",
    "channel.update",
    "channel.config.update",
    "menu.network",
    "network.view",
    // (3) 成员管理（本渠道范围内）
    "menu.members",
    "channel-member.read",
    "channel-member.add",
    "channel-member.remove",
    // (4) 分销邀请
    "menu.invite",
    "user-invite.send",
    "user-invite.validate",
    // (5) 渠道权限
    "menu.channel-permission",
    "channel-permission.set",
    "channel.user-channel.read",
    "channel.user-channel.assign",
    "channel.user-channel.revoke",
    // (6) 兑换码 + 兑换记录（渠道运营）
    "menu.redemption-code",
    "redemption-code.create",
    "redemption-code.delete",
    "menu.redemption-record",
    "redemption-record.review",
    // (7) 租户管理（仅读取 + 创建自己租户 + 更新自己租户；不含 delete）
    "menu.tenant",
    "tenant.read",
    "tenant.create",
    "tenant.update",
    // (8) 站点配置（仅创建 + 更新自己租户的 site-config）
    "menu.site-config",
    "site-config.update",
    "config.read",
    "config.create",
    "config.update",
    // (9) 功能开关（本租户内的粗粒度开关 + 细粒度配置）
    "menu.feature-flag",
    "feature-flag.update",
    "config.feature.update",
    // (10) 模块可见性（本租户内的角色可见性配置）
    "menu.module-visibility",
    // (11) 用户角色管理（分配/撤销；不含 role.create 防止绕过白名单）
    "menu.user-roles",
    "role.read",
    "role.assign",
    "role.revoke",
    "role.read-logs",
    // (12) 媒体资源（本租户内的 OSS 资源管理）
    "oss.media-meta.read",
    "oss.media-meta.upload",
    // 注：不含 oss.media-meta.delete（删除需 admin 或 system-manager）
    // (13) 模板 + 第三方配置（只读，创建租户时需加载模板列表和第三方配置）
    "template.read",
    "third-party-config.read",
    // (14) 新增：工作室推广 + 审计日志（channel-admin 可管理推广渠道/活动/AB实验/渠道报表 + 查看审计日志）
    "zhao-studio.promo-channel.manage",
    "zhao-studio.promo-campaign.manage",
    "zhao-studio.ab-experiment.manage",
    "zhao-studio.channel-report.view",
    "zhao-auth.audit-log.view"
    // ===== 显式排除（不再包含）=====
    // - flattenPermissions(PERMISSION_TREE)：不再自动获得全部中心权限
    // - tenant.delete：跨租户删除，不应下放
    // - role.create：防止 channel-admin 创建"全权限自定义角色"绕过白名单（见 Task 6.7 createRole 白名单）
    // - *-global 后缀权限：跨租户全局操作，不应下放
    // - sso.* 权限：与 DEFAULT_MODULE_VISIBILITY 不一致（sso 模块对 channel-admin 不可见）
    // - oss.media-meta.delete：删除敏感，仅 admin 或 system-manager
    // - 22 个中心的业务权限（course/quiz/point/...）：channel-admin 职责是渠道管理，不管理各中心业务内容
    //   如需让 channel-admin 管理某中心内容，admin 应通过角色分配给 channel-admin 额外叠加中心角色（如 website-manager）
  ],
  [ROLES.PLUGIN_MANAGER]: flattenPermissions(
    ((t) => {
      const result = {};
      for (const key of [
        "menu.course-center",
        "menu.quiz-center",
        "menu.point-center",
        "menu.tag-center",
        "menu.studio-center"
      ]) {
        if (t[key]) result[key] = t[key];
      }
      return result;
    })(PERMISSION_TREE)
  ).concat([
    "menu.site-config",
    "site-config.update",
    "config.read",
    "config.update",
    "config.feature.update",
    "channel.config.update",
    // 官网中心（read/create/update，不含 delete/manage）
    "menu.website-center",
    "menu.website-seo",
    "seo-config.read",
    "menu.website-brand",
    "brand-info.read",
    "menu.website-article",
    "article.read",
    "article.create",
    "article.update",
    "menu.website-article-category",
    "article-category.read",
    "article-category.create",
    "article-category.update",
    "menu.website-product",
    "product.read",
    "product.create",
    "product.update",
    "menu.website-case",
    "case.read",
    "case.create",
    "case.update",
    "menu.website-compliance",
    "compliance.read",
    "compliance.create",
    "compliance.update",
    "menu.website-faq",
    "faq.read",
    "faq.create",
    "faq.update",
    "menu.website-tutorial",
    "tutorial.read",
    "tutorial.create",
    "tutorial.update",
    "menu.website-download",
    "download.read",
    "download.create",
    "download.update",
    "menu.website-lead",
    "lead.read",
    "lead.update",
    "menu.website-visit-log",
    "visit-log.read",
    "menu.website-interaction",
    "interaction.read",
    "menu.website-search-log",
    "search-log.read",
    "menu.website-knowledge-entity",
    "knowledge-entity.read",
    "menu.website-knowledge-relation",
    "knowledge-relation.read",
    "menu.website-ai-summary",
    "ai-summary.read",
    "ai-summary.create",
    "menu.website-first-truth",
    "first-truth.read",
    "menu.website-brand-voice",
    "brand-voice.read",
    "brand-voice.create",
    "brand-voice.update",
    "brand-voice.delete",
    // 物流中心（read/create/update，不含 delete）
    "menu.logistics-center",
    "menu.logistics-quote",
    "logistics.quote-request.read",
    "logistics.quote-request.create",
    "logistics.quote-request.update",
    "logistics.quote-field-rule.read",
    "logistics.quote-field-rule.create",
    "logistics.quote-field-rule.update",
    "logistics.quote-price-rule.read",
    "logistics.quote-price-rule.create",
    "logistics.quote-price-rule.update",
    "logistics.quote-price-formula.read",
    "menu.logistics-tracking",
    "logistics.tracking-shipment.read",
    "logistics.tracking-shipment.create",
    "logistics.tracking-shipment.update",
    "logistics.tracking-node.read",
    "logistics.tracking-provider.read",
    "menu.logistics-contact",
    "logistics.contact-matrix.read",
    "logistics.contact-matrix.create",
    "logistics.contact-matrix.update",
    "menu.logistics-review",
    "logistics.review.read",
    "logistics.review.create",
    "logistics.review.update",
    "menu.logistics-subscription",
    "logistics.subscription.read",
    "menu.logistics-landing",
    "logistics.landing-page.read",
    "logistics.landing-page.create",
    "logistics.landing-page.update",
    "menu.logistics-funnel",
    "logistics.conversion-funnel.read",
    "logistics.funnel-stats.read",
    "logistics.conversion-event.read",
    "menu.logistics-order",
    "logistics.intent-order.read",
    "logistics.intent-order.create",
    "logistics.intent-order.update",
    "menu.logistics-referral",
    "logistics.referral.read",
    "logistics.referral-stats.read",
    "menu.logistics-customer",
    "logistics.customer-profile.read",
    "logistics.customer-profile.update",
    // 理财中心（read/create/update，不含 delete）
    "menu.wealth-center",
    "menu.wealth-product",
    "wealth.wealth-product.read",
    "wealth.wealth-product.create",
    "wealth.wealth-product.update",
    "wealth.wealth-product.collect",
    "wealth.wealth-nav.read",
    "wealth.wealth-nav.create",
    "wealth.wealth-nav.update",
    "menu.wealth-company",
    "wealth.wealth-company.read",
    "wealth.wealth-company.create",
    "wealth.wealth-company.update",
    "menu.wealth-collect",
    "wealth.wealth-collect-config.read",
    "wealth.wealth-collect-config.create",
    "wealth.wealth-collect-config.update",
    "wealth.wealth-collect-config.trigger",
    "wealth.wealth-customer-product.read",
    "wealth.wealth-customer-product.create",
    "menu.wealth-metrics",
    "wealth.wealth-risk-metric.read",
    "wealth.wealth-risk-metric.aggregate",
    "wealth.wealth-risk-metric.trend",
    "wealth.wealth-risk-metric.peers",
    "wealth.wealth-recommend-config.read",
    "wealth.wealth-recommend-config.create",
    "wealth.wealth-recommend-config.update",
    "wealth.wealth-annual-snapshot.read",
    "wealth.wealth-yearly-return.read",
    "wealth.wealth-money-income.read",
    // SSO 扩展（read 为主）
    "menu.sso-binding",
    "sso.third-party-binding.read",
    "sso.oauth-config.read",
    "menu.sso-token",
    "sso.token.read",
    "menu.sso-user-role",
    "sso.user-app-role.read",
    "menu.sso-invite",
    "sso.invite-code.read",
    "sso.invite-stats.read",
    "menu.sso-sms",
    "sso.sms-code.read",
    // 零散补全
    "oss.media-meta.read",
    "auth.admin-login",
    // 新增：deal/track 只读权限
    "zhao-deal.coupon.view",
    "zhao-deal.product.view",
    "zhao-track.click-event.view",
    "zhao-track.order.view"
  ]),
  [ROLES.INSTRUCTOR]: [
    // 课程中心
    "menu.course-center",
    "menu.course",
    "course.read",
    "course.create",
    "course.update",
    "course.publish",
    "menu.lesson",
    "lesson.read",
    "lesson.create",
    "lesson.update",
    "lesson.delete",
    "menu.category",
    "course-category.read",
    "course-category.create",
    "course-category.update",
    "menu.auth",
    "user-course.read",
    "user-course.grant",
    // 学习数据
    "menu.study-center",
    "menu.progress",
    "course-progress.read",
    "course-progress.update",
    "menu.lesson-progress",
    "lesson-progress.read",
    "lesson-progress.update",
    // 标签体系
    "menu.tag-center",
    "menu.tag",
    "tag.read",
    "tag.create",
    "tag.update",
    "menu.knowledge",
    "knowledge-point.read",
    "knowledge-point.create",
    "knowledge-point.update",
    // 官网中心（只读）
    "menu.website-center",
    "menu.website-brand",
    "brand-info.read",
    "menu.website-article",
    "article.read",
    "menu.website-product",
    "product.read",
    "menu.website-case",
    "case.read",
    "menu.website-compliance",
    "compliance.read",
    "menu.website-faq",
    "faq.read",
    "menu.website-tutorial",
    "tutorial.read",
    "menu.website-download",
    "download.read",
    "menu.website-lead",
    "lead.read",
    // 物流中心（只读）
    "menu.logistics-center",
    "menu.logistics-quote",
    "logistics.quote-request.read",
    "logistics.quote-field-rule.read",
    "logistics.quote-price-rule.read",
    "menu.logistics-tracking",
    "logistics.tracking-shipment.read",
    "logistics.tracking-node.read",
    "menu.logistics-contact",
    "logistics.contact-matrix.read",
    "menu.logistics-review",
    "logistics.review.read",
    "menu.logistics-landing",
    "logistics.landing-page.read",
    // 理财中心（只读）
    "menu.wealth-center",
    "menu.wealth-product",
    "wealth.wealth-product.read",
    "wealth.wealth-nav.read",
    "menu.wealth-company",
    "wealth.wealth-company.read",
    "menu.wealth-collect",
    "wealth.wealth-collect-config.read",
    "wealth.wealth-customer-product.read",
    "menu.wealth-metrics",
    "wealth.wealth-risk-metric.read",
    "wealth.wealth-recommend-config.read",
    "wealth.wealth-annual-snapshot.read",
    "wealth.wealth-yearly-return.read",
    "wealth.wealth-money-income.read",
    // 直播工作室（只读）
    "menu.studio-collect",
    "studio.article-draft.read",
    "studio.collect-source.read",
    "studio.collect-task.read",
    "menu.studio-publish",
    "studio.publish-platform.read",
    "studio.publish-account.read",
    "studio.publish-record.read",
    "menu.studio-stats",
    "studio.stat-summary.read",
    "menu.studio-ad",
    "studio.ad-slot.read",
    // 零散补全（只读）
    "point.rule-template.read",
    "point.sign-in-record.read",
    "quiz.quiz-batch.read",
    "tag.tag-index.read",
    "auth.admin-login",
    // 允许讲师登录后台
    // 新增：deal/track 只读权限 + studio 推广只读
    "zhao-deal.coupon.view",
    "zhao-deal.product.view",
    "zhao-deal.coupon-candidate.view",
    "zhao-deal.product-candidate.view",
    "zhao-track.click-event.view",
    "zhao-track.order.view",
    "zhao-studio.channel-report.view",
    "zhao-studio.stat-summary.view"
  ],
  [ROLES.USER]: [],
  // ===== 11 个中心 × 2 = 22 个新角色 =====
  // 所有中心角色追加 auth.admin-login，被分配即可登录后台（菜单权限仍由 centerPermissions 限定）
  [ROLES.WEBSITE_MANAGER]: centerPermissions("menu.website-center").filter((k) => !k.endsWith("-global")).concat(["auth.admin-login"]),
  [ROLES.WEBSITE_EDITOR]: centerEditorPermissions("menu.website-center").filter((k) => !k.endsWith("-global")).concat(["auth.admin-login"]),
  [ROLES.LOGISTICS_MANAGER]: centerPermissions("menu.logistics-center").concat(["auth.admin-login"]),
  [ROLES.LOGISTICS_EDITOR]: centerEditorPermissions("menu.logistics-center").concat(["auth.admin-login"]),
  [ROLES.COURSE_MANAGER]: centerPermissions("menu.course-center").concat(["auth.admin-login"]),
  [ROLES.COURSE_EDITOR]: centerEditorPermissions("menu.course-center").concat(["auth.admin-login"]),
  [ROLES.STUDY_MANAGER]: centerPermissions("menu.study-center").concat(["auth.admin-login"]),
  [ROLES.STUDY_EDITOR]: centerEditorPermissions("menu.study-center").concat(["auth.admin-login"]),
  [ROLES.QUIZ_MANAGER]: centerPermissions("menu.quiz-center").concat(["auth.admin-login"]),
  [ROLES.QUIZ_EDITOR]: centerEditorPermissions("menu.quiz-center").concat(["auth.admin-login"]),
  [ROLES.POINT_MANAGER]: centerPermissions("menu.point-center").concat(["auth.admin-login"]),
  [ROLES.POINT_EDITOR]: centerEditorPermissions("menu.point-center").concat(["auth.admin-login"]),
  [ROLES.MARKETING_MANAGER]: centerPermissions("menu.marketing-center").concat(["auth.admin-login"]),
  [ROLES.MARKETING_EDITOR]: centerEditorPermissions("menu.marketing-center").concat(["auth.admin-login"]),
  [ROLES.SYSTEM_MANAGER]: centerPermissions("menu.system-center").concat(["auth.admin-login"]),
  [ROLES.SYSTEM_EDITOR]: centerEditorPermissions("menu.system-center").concat(["auth.admin-login"]),
  [ROLES.TAG_MANAGER]: centerPermissions("menu.tag-center").concat(["auth.admin-login"]),
  [ROLES.TAG_EDITOR]: centerEditorPermissions("menu.tag-center").concat(["auth.admin-login"]),
  [ROLES.STUDIO_MANAGER]: centerPermissions("menu.studio-center").concat(["auth.admin-login"]),
  [ROLES.STUDIO_EDITOR]: centerEditorPermissions("menu.studio-center").concat(["auth.admin-login"]),
  [ROLES.WEALTH_MANAGER]: centerPermissions("menu.wealth-center").concat(["auth.admin-login"]),
  [ROLES.WEALTH_EDITOR]: centerEditorPermissions("menu.wealth-center").concat(["auth.admin-login"])
};
Object.defineProperty(DEFAULT_ROLE_PERMISSIONS, "__version", {
  value: "2026-07-22",
  enumerable: false,
  writable: false,
  configurable: false
});
const permissions = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  DEFAULT_ROLE_PERMISSIONS,
  MODULE_MANAGER_MAP,
  PERMISSION_TREE,
  ROLES,
  ROLE_LABELS,
  centerEditorPermissions,
  centerPermissions,
  expandPermissionKeys: expandPermissionKeys$1,
  flattenPermissions,
  getPermissionLabel
}, Symbol.toStringTag, { value: "Module" }));
const USER_UID$1 = "plugin::users-permissions.user";
function throwErr(code, status, message) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  throw e;
}
const ROLE_HIERARCHY = {
  admin: 100,
  "channel-admin": 80,
  "plugin-manager": 60,
  instructor: 40,
  user: 20
};
const ROLE_INHERITANCE = {
  admin: ["channel-admin", "plugin-manager", "instructor", "user"],
  "channel-admin": ["plugin-manager", "instructor", "user"],
  "plugin-manager": ["instructor", "user"],
  instructor: ["user"],
  user: []
};
const ABSOLUTE_CORE_ROLES = ["admin", "user"];
function isProtected(assignment, operatorRoles) {
  if (ABSOLUTE_CORE_ROLES.includes(assignment.role)) return true;
  if (operatorRoles.includes("admin")) return false;
  return assignment.assignedByRole === "admin";
}
const CACHE_TTL = 3e5;
const permissionCache$1 = /* @__PURE__ */ new Map();
function invalidateUserCache(userId) {
  permissionCache$1.delete(userId);
}
function extractRoleNames(user) {
  const arr = Array.isArray(user?.zhaoRoles) ? user.zhaoRoles : [];
  return arr.map((r) => typeof r === "string" ? r : r?.role).filter((name) => typeof name === "string" && name.trim());
}
const PERMISSION_UID$2 = "plugin::zhao-auth.permission";
async function annotateUserRoles(user, _tenantDocumentId) {
  const { ROLE_LABELS: ROLE_LABELS2 } = await Promise.resolve().then(() => permissions);
  const directRoles = extractRoleNames(user);
  const isAdmin = directRoles.includes("admin");
  const rawAssignments = Array.isArray(user?.zhaoRoles) ? user.zhaoRoles : [];
  return directRoles.map((role) => {
    const rawAssignment = rawAssignments.find(
      (r) => typeof r === "string" ? r === role : r?.role === role
    );
    const assignedByRole = rawAssignment && typeof rawAssignment !== "string" ? rawAssignment.assignedByRole ?? "system" : "system";
    const assignedAt = rawAssignment && typeof rawAssignment !== "string" ? rawAssignment.assignedAt ?? null : null;
    let source = "explicit";
    let sourceDescription = "显式分配";
    if (isAdmin) {
      source = "explicit";
      sourceDescription = "admin 显式分配";
    } else if (assignedByRole === "admin" || assignedByRole === "system") {
      source = "explicit";
      sourceDescription = assignedByRole === "admin" ? "admin 分配" : "系统分配";
    }
    return {
      role,
      label: ROLE_LABELS2[role] || role,
      source,
      sourceDescription,
      assignedByRole,
      assignedAt
    };
  });
}
async function checkPermission(userId, action, tenantDocumentId) {
  const permissions2 = await this.strapi.plugin("zhao-auth").service("permission").getMyPermissions(userId, tenantDocumentId);
  return permissions2.includes(action);
}
const roleManagementService = ({ strapi: strapi2 }) => {
  async function getRoleLevel(role) {
    if (ROLE_HIERARCHY[role] != null) return ROLE_HIERARCHY[role];
    const roleRecord = await strapi2.db.query(PERMISSION_UID$2).findOne({
      where: { role },
      select: ["level"]
    });
    return roleRecord?.level ?? 20;
  }
  async function getUserLevel(userId) {
    const user = await strapi2.db.query(USER_UID$1).findOne({
      where: { id: userId },
      select: ["zhaoRoles"],
      populate: ["role"]
    });
    if (!user) return 20;
    const roles = extractRoleNames(user);
    if (roles.length === 0) return 20;
    const levels = await Promise.all(roles.map(getRoleLevel));
    return Math.max(...levels);
  }
  async function computeOperatorOwnedRoles(operatorId, operatorTenantDocumentId) {
    const operator = await strapi2.db.query(USER_UID$1).findOne({
      where: { id: operatorId },
      select: ["zhaoRoles"]
    });
    const operatorRoles = Array.isArray(operator?.zhaoRoles) ? operator.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((r) => r && r.trim()) : [];
    if (operatorRoles.includes("admin")) {
      const { ROLES: ROLES2 } = await Promise.resolve().then(() => permissions);
      return Object.values(ROLES2);
    }
    const ownedSet = new Set(operatorRoles);
    try {
      const moduleVisibility2 = await strapi2.plugin("zhao-auth").service("permission").resolveModuleVisibility(operatorTenantDocumentId);
      const { MODULE_MANAGER_MAP: MODULE_MANAGER_MAP2 } = await Promise.resolve().then(() => permissions);
      for (const [moduleKey, roles] of Object.entries(moduleVisibility2)) {
        if (roles.includes("channel-admin")) {
          const managerRole = MODULE_MANAGER_MAP2[moduleKey];
          if (managerRole) {
            ownedSet.add(managerRole);
          }
        }
      }
    } catch {
    }
    return Array.from(ownedSet);
  }
  async function resolveTenantUserIds(operatorId, _tenantDocumentId) {
    try {
      const operatorChannels = await strapi2.db.query("plugin::zhao-channel.channel-member").findMany({
        where: { user: operatorId, isCurrent: true },
        populate: { channel: { select: ["id"] } }
      });
      const operatorChannelIds = operatorChannels.map((cm) => cm.channel?.id).filter(Boolean);
      if (operatorChannelIds.length === 0) return null;
      const targetMembers = await strapi2.db.query("plugin::zhao-channel.channel-member").findMany({
        where: { channel: { id: { $in: operatorChannelIds } } },
        populate: { user: { select: ["id"] } }
      });
      return targetMembers.map((m) => m.user?.id).filter((id) => id != null);
    } catch {
      return null;
    }
  }
  async function getUserEffectivePermissions(userId) {
    const cached = permissionCache$1.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    const user = await strapi2.db.query(USER_UID$1).findOne({
      where: { id: userId },
      select: ["id", "zhaoRoles"],
      populate: ["role"]
    });
    if (!user) {
      return { direct: [], inherited: [], effective: [] };
    }
    let directRoles = [];
    if (Array.isArray(user.zhaoRoles) && user.zhaoRoles.length > 0) {
      directRoles = user.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((name) => name && name.trim());
    } else if (user.role?.type) {
      directRoles = [user.role.type];
    } else if (user.role?.name) {
      directRoles = [user.role.name];
    }
    const inheritedRoles = [];
    for (const role of directRoles) {
      const parents = ROLE_INHERITANCE[role];
      if (parents) {
        for (const parent of parents) {
          if (!inheritedRoles.includes(parent)) {
            inheritedRoles.push(parent);
          }
        }
      }
    }
    const effective = [...directRoles, ...inheritedRoles];
    const permissions2 = {
      direct: directRoles,
      inherited: inheritedRoles,
      effective
    };
    permissionCache$1.set(userId, { data: permissions2, timestamp: Date.now() });
    return permissions2;
  }
  return {
    /**
     * 查询用户列表
     * @param filters 筛选条件（支持 username/email/role）
     * @param page 页码
     * @param pageSize 每页数量
     * @param operatorId 操作者 ID（用于租户过滤）
     * @param tenantDocumentId 当前租户 documentId（来自 ctx.state.siteDocumentId）
     */
    async findUsers(filters = {}, page = 1, pageSize = 20, operatorId, tenantDocumentId) {
      const where = {};
      if (filters["filters[username][$contains]"]) {
        where.username = { $contains: filters["filters[username][$contains]"] };
      } else if (filters.username) {
        where.username = { $contains: filters.username };
      }
      if (filters["filters[email][$contains]"]) {
        where.email = { $contains: filters["filters[email][$contains]"] };
      } else if (filters.email) {
        where.email = { $contains: filters.email };
      }
      const roleFilter = filters["filters[role][$contains]"] || filters.role;
      if (roleFilter) {
        where.zhaoRoles = { $contains: roleFilter };
      }
      let tenantUserIds = null;
      if (operatorId) {
        const operator = await strapi2.db.query(USER_UID$1).findOne({
          where: { id: operatorId },
          select: ["zhaoRoles"]
        });
        const operatorRoles = Array.isArray(operator?.zhaoRoles) ? operator.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((r) => r && r.trim()) : [];
        const isAdmin = operatorRoles.includes("admin");
        if (!isAdmin) {
          tenantUserIds = await resolveTenantUserIds(operatorId);
          if (tenantUserIds && tenantUserIds.length > 0) {
            where.id = { $in: tenantUserIds };
          } else if (tenantUserIds && tenantUserIds.length === 0) {
            return {
              list: [],
              pagination: { page, pageSize, total: 0, pageCount: 0 }
            };
          }
        }
      }
      const users = await strapi2.db.query(USER_UID$1).findMany({
        where,
        select: ["id", "email", "username", "createdAt", "zhaoRoles"],
        populate: ["role"],
        orderBy: { id: "asc" },
        offset: (page - 1) * pageSize,
        limit: pageSize
      });
      const total = await strapi2.db.query(USER_UID$1).count({ where });
      const list = await Promise.all(
        users.map(async (user) => {
          const rolesWithSource = await annotateUserRoles(user);
          return {
            id: user.id,
            documentId: user.id,
            username: user.username,
            email: user.email,
            roles: rolesWithSource.map((r) => r.role),
            roleSources: rolesWithSource,
            createdAt: user.createdAt
          };
        })
      );
      return {
        list,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    },
    /**
     * 分配角色给用户
     *
     * 业务约束：
     * - channel-admin 角色仅可分配给 ADMIN_CHANNEL_TIERS 渠道所有者
     * - 非 admin 操作者只能分配自己拥有的角色（子集校验，ROLE_006）
     * - 非 admin 操作者只能分配自己渠道内成员（ROLE_005）
     *
     * @param userId 用户ID
     * @param role 角色名称
     * @param operatorId 操作人ID
     * @param reason 操作原因
     * @param operatorTenantDocumentId 操作者当前租户 documentId（来自 ctx.state.siteDocumentId）
     */
    async assignRole(userId, role, operatorId, reason, operatorTenantDocumentId) {
      if (!role || typeof role !== "string" || !role.trim()) {
        throwErr("INVALID_ROLE", 400, `角色名不能为空`);
      }
      const normalizedRole = role.trim();
      const user = await strapi2.db.query(USER_UID$1).findOne({
        where: { id: userId },
        select: ["id", "zhaoRoles"],
        populate: ["role"]
      });
      if (!user) {
        throwErr("USER_NOT_FOUND", 404, "用户不存在");
      }
      const currentRoles = extractRoleNames(user);
      if (currentRoles.includes(normalizedRole)) {
        throwErr("ROLE_ALREADY_ASSIGNED", 409, `用户已拥有角色: ${normalizedRole}`);
      }
      if (ABSOLUTE_CORE_ROLES.includes(normalizedRole)) {
        throwErr("ABSOLUTE_CORE_ROLE", 400, `绝对基础角色 ${normalizedRole} 不可手动分配`);
      }
      const operatorLevel = await getUserLevel(operatorId);
      const isOperatorAdmin = operatorLevel >= 100;
      if (!isOperatorAdmin) {
        const targetLevel = await getRoleLevel(normalizedRole);
        if (targetLevel > operatorLevel) {
          throwErr("ROLE_004", 403, "不能分配同级或更高层级角色");
        }
      }
      if (!isOperatorAdmin) {
        const operatorChannels = await strapi2.db.query("plugin::zhao-channel.channel-member").findMany({
          where: { user: operatorId, isCurrent: true },
          populate: { channel: { select: ["id"] } }
        });
        const operatorChannelIds = operatorChannels.map((cm) => cm.channel?.id).filter(Boolean);
        if (operatorChannelIds.length === 0) {
          throwErr("ROLE_005", 403, "操作者未归属任何渠道");
        }
        const targetUserChannels = await strapi2.db.query("plugin::zhao-channel.channel-member").findMany({
          where: { user: userId, channel: { id: { $in: operatorChannelIds } } }
        });
        if (targetUserChannels.length === 0) {
          throwErr("ROLE_005", 403, "只能分配自己渠道内成员");
        }
      }
      if (!isOperatorAdmin) {
        const ownedRoles = await computeOperatorOwnedRoles(operatorId, operatorTenantDocumentId);
        if (!ownedRoles.includes(normalizedRole)) {
          throwErr(
            "ROLE_006",
            403,
            `只能分配自己拥有的角色，未拥有: ${normalizedRole}`
          );
        }
      }
      const operator = await strapi2.db.query(USER_UID$1).findOne({
        where: { id: operatorId },
        select: ["zhaoRoles"]
      });
      const operatorRoles = extractRoleNames(operator);
      const assignedByRole = operatorRoles.includes("admin") ? "admin" : operatorRoles[0] || "system";
      const currentAssignments = Array.isArray(user.zhaoRoles) ? user.zhaoRoles : [];
      const newAssignment = {
        role: normalizedRole,
        assignedByRole,
        assignedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const newRoles = [...currentAssignments, newAssignment];
      await strapi2.db.query(USER_UID$1).update({
        where: { id: userId },
        data: { zhaoRoles: newRoles }
      });
      if (!isOperatorAdmin) {
        const operatorChannels = await strapi2.db.query("plugin::zhao-channel.channel-member").findMany({
          where: { user: operatorId, isCurrent: true },
          populate: { channel: { select: ["id"] } }
        });
        const currentChannelId = operatorChannels[0]?.channel?.id;
        if (currentChannelId != null) {
          const existing = await strapi2.db.query("plugin::zhao-auth.role-channel").findOne({
            where: { role: normalizedRole, channel: currentChannelId }
          });
          if (!existing) {
            await strapi2.db.query("plugin::zhao-auth.role-channel").create({
              data: { role: normalizedRole, channel: currentChannelId, assignedBy: operatorId }
            });
          }
        }
      }
      invalidateUserCache(userId);
      try {
        strapi2.plugin("zhao-auth")?.service("permission")?.invalidateCache?.(userId);
      } catch {
      }
      await this.logAction(operatorId, userId, "assign", role, reason);
      return {
        success: true,
        message: `角色 ${role} 分配成功`,
        user: {
          id: userId,
          roles: extractRoleNames({ zhaoRoles: newRoles })
        }
      };
    },
    /**
     * 撤销用户角色
     * - 非 admin：渠道校验（只能撤销自己渠道内成员）+ 子集校验（只能撤销自己拥有的角色）
     * - 保留"至少一个角色"校验
     *
     * @param userId 用户ID
     * @param role 角色名称
     * @param operatorId 操作人ID
     * @param reason 操作原因
     * @param operatorTenantDocumentId 操作者当前租户 documentId
     */
    async revokeRole(userId, role, operatorId, reason, operatorTenantDocumentId) {
      const user = await strapi2.db.query(USER_UID$1).findOne({
        where: { id: userId },
        select: ["id", "zhaoRoles"],
        populate: ["role"]
      });
      if (!user) {
        throwErr("USER_NOT_FOUND", 404, "用户不存在");
      }
      const currentRoles = extractRoleNames(user);
      if (!currentRoles.includes(role)) {
        throwErr("ROLE_NOT_ASSIGNED", 400, `用户未拥有角色: ${role}`);
      }
      if (currentRoles.length === 1) {
        throwErr("MIN_ROLE_REQUIRED", 400, "用户至少需要拥有一个角色");
      }
      if (ABSOLUTE_CORE_ROLES.includes(role)) {
        throwErr("ABSOLUTE_CORE_ROLE", 400, `绝对基础角色 ${role} 不可撤销`);
      }
      const assignments = Array.isArray(user.zhaoRoles) ? user.zhaoRoles : [];
      const assignment = assignments.find(
        (r) => typeof r === "string" ? r === role : r?.role === role
      );
      if (!assignment) {
        throwErr("ROLE_NOT_ASSIGNED", 404, `用户未拥有角色: ${role}`);
      }
      const operator = await strapi2.db.query(USER_UID$1).findOne({
        where: { id: operatorId },
        select: ["zhaoRoles"]
      });
      const operatorRoles = extractRoleNames(operator);
      const assignmentObj = typeof assignment === "string" ? { role: assignment, assignedByRole: "system" } : assignment;
      if (isProtected(assignmentObj, operatorRoles)) {
        throwErr("PROTECTED_ROLE", 400, `角色 ${role} 受保护，当前操作者无权撤销`);
      }
      const operatorLevel = await getUserLevel(operatorId);
      const isOperatorAdmin = operatorLevel >= 100;
      if (!isOperatorAdmin) {
        const operatorChannels = await strapi2.db.query("plugin::zhao-channel.channel-member").findMany({
          where: { user: operatorId, isCurrent: true },
          populate: { channel: { select: ["id"] } }
        });
        const operatorChannelIds = operatorChannels.map((cm) => cm.channel?.id).filter(Boolean);
        if (operatorChannelIds.length === 0) {
          throwErr("ROLE_005", 403, "操作者未归属任何渠道");
        }
        const targetUserChannels = await strapi2.db.query("plugin::zhao-channel.channel-member").findMany({
          where: { user: userId, channel: { id: { $in: operatorChannelIds } } }
        });
        if (targetUserChannels.length === 0) {
          throwErr("ROLE_005", 403, "只能撤销自己渠道内成员的角色");
        }
        const ownedRoles = await computeOperatorOwnedRoles(operatorId, operatorTenantDocumentId);
        if (!ownedRoles.includes(role)) {
          throwErr(
            "ROLE_006",
            403,
            `只能撤销自己拥有的角色，未拥有: ${role}`
          );
        }
      }
      const newRoles = assignments.filter(
        (r) => typeof r === "string" ? r !== role : r?.role !== role
      );
      await strapi2.db.query(USER_UID$1).update({
        where: { id: userId },
        data: { zhaoRoles: newRoles }
      });
      invalidateUserCache(userId);
      try {
        strapi2.plugin("zhao-auth")?.service("permission")?.invalidateCache?.(userId);
      } catch {
      }
      await this.logAction(operatorId, userId, "revoke", role, reason);
      return {
        success: true,
        message: `角色 ${role} 撤销成功`,
        user: {
          id: userId,
          roles: extractRoleNames({ zhaoRoles: newRoles })
        }
      };
    },
    /**
     * 获取用户角色列表
     * @param userId 用户ID
     */
    async getUserRoles(userId) {
      const user = await strapi2.db.query(USER_UID$1).findOne({
        where: { id: userId },
        select: ["id", "email", "username", "zhaoRoles"],
        populate: ["role"]
      });
      if (!user) {
        throwErr("USER_NOT_FOUND", 404, "用户不存在");
      }
      const roleNames = extractRoleNames(user);
      const roles = roleNames.map((name) => {
        const roleObj = user.role;
        return {
          id: roleObj?.id,
          name,
          description: roleObj?.description
        };
      });
      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        },
        roles
      };
    },
    /**
     * 获取用户详情（含角色来源标注）
     * @param userId 目标用户 ID
     * @param operatorId 操作者 ID（保留参数，便于未来加审计）
     * @param tenantDocumentId 当前租户 documentId
     */
    async getUserDetail(userId, operatorId, tenantDocumentId) {
      const user = await strapi2.db.query(USER_UID$1).findOne({
        where: { id: userId },
        select: ["id", "email", "username", "createdAt", "zhaoRoles"],
        populate: ["role"]
      });
      if (!user) {
        throwErr("USER_NOT_FOUND", 404, "用户不存在");
      }
      const rolesWithSource = await annotateUserRoles(user);
      const bySource = {
        core: rolesWithSource.filter((r) => r.source === "core"),
        auto: rolesWithSource.filter((r) => r.source === "auto"),
        explicit: rolesWithSource.filter((r) => r.source === "explicit")
      };
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        },
        roles: rolesWithSource,
        rolesBySource: bySource
      };
    },
    /**
     * 获取当前操作者可分配的角色列表
     * - admin：返回全部角色（ROLES 全集 + 数据库自定义角色）
     * - 非 admin：返回"拥有的角色全集"（zhaoRoles ∪ moduleVisibility 自动授权）
     *
     * @param operatorId 操作者 ID
     * @param tenantDocumentId 当前租户 documentId
     */
    async getAssignableRoles(operatorId, tenantDocumentId) {
      const { ROLES: ROLES2, ROLE_LABELS: ROLE_LABELS2 } = await Promise.resolve().then(() => permissions);
      const ownedRoles = await computeOperatorOwnedRoles(operatorId, tenantDocumentId);
      const ownedSet = new Set(ownedRoles);
      let dbRoles = [];
      try {
        dbRoles = await strapi2.db.query(PERMISSION_UID$2).findMany({
          orderBy: { id: "asc" }
        });
      } catch {
      }
      const allRoleNames = new Set(Object.values(ROLES2));
      for (const r of dbRoles) {
        if (r?.role) allRoleNames.add(r.role);
      }
      const operator = await strapi2.db.query(USER_UID$1).findOne({
        where: { id: operatorId },
        select: ["zhaoRoles"]
      });
      const operatorRoles = Array.isArray(operator?.zhaoRoles) ? operator.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((r) => r && r.trim()) : [];
      const isAdmin = operatorRoles.includes("admin");
      const result = [];
      for (const role of allRoleNames) {
        if (ABSOLUTE_CORE_ROLES.includes(role)) continue;
        if (!isAdmin && !ownedSet.has(role)) continue;
        let source = "explicit";
        if (isAdmin) {
          source = "explicit";
        } else {
          const CORE_ROLES = ["channel-admin", "instructor", "user", "plugin-manager", "admin"];
          let autoRoles = /* @__PURE__ */ new Set();
          try {
            const moduleVisibility2 = await strapi2.plugin("zhao-auth").service("permission").resolveModuleVisibility(tenantDocumentId);
            const { MODULE_MANAGER_MAP: MODULE_MANAGER_MAP2 } = await Promise.resolve().then(() => permissions);
            for (const [moduleKey, roles] of Object.entries(moduleVisibility2)) {
              if (roles.includes("channel-admin")) {
                const managerRole = MODULE_MANAGER_MAP2[moduleKey];
                if (managerRole) autoRoles.add(managerRole);
              }
            }
          } catch {
          }
          if (autoRoles.has(role) && operatorRoles.includes(role)) {
            source = "explicit";
          } else if (autoRoles.has(role)) {
            source = "auto";
          } else if (CORE_ROLES.includes(role)) {
            source = "core";
          } else {
            source = "explicit";
          }
        }
        result.push({
          role,
          label: ROLE_LABELS2[role] || role,
          source
        });
      }
      return {
        roles: result,
        isAdmin
      };
    },
    /**
     * 批量分配角色
     * 透传 operatorTenantDocumentId 给 assignRole，自动执行子集校验
     */
    async batchAssignRoles(userIds, role, operatorId, reason, operatorTenantDocumentId) {
      const results = [];
      for (const userId of userIds) {
        try {
          await this.assignRole(userId, role, operatorId, reason, operatorTenantDocumentId);
          results.push({ userId, success: true, message: "分配成功" });
        } catch (error) {
          results.push({ userId, success: false, message: error.message });
        }
      }
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;
      return {
        success: failCount === 0,
        message: `批量分配完成: ${successCount} 成功, ${failCount} 失败`,
        results
      };
    },
    /**
     * 记录操作日志
     * @param operatorId 操作人ID
     * @param targetUserId 目标用户ID
     * @param action 操作类型
     * @param role 角色名称
     * @param reason 操作原因
     */
    async logAction(operatorId, targetUserId, action, role, reason) {
      try {
        const logEntry = {
          operatorId,
          targetUserId,
          action,
          role,
          reason,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        strapi2.log.info(`[zhao-auth] Role action: ${action} ${role} for user ${targetUserId} by operator ${operatorId}`);
        await strapi2.db.query("plugin::zhao-auth.role-action-log").create({
          data: logEntry
        });
      } catch (error) {
        strapi2.log.error(`[zhao-auth] Failed to log role action: ${error}`);
      }
    },
    /**
     * 获取角色操作日志
     * @param userId 可选，按目标用户筛选
     * @param operatorId 可选，按操作人筛选
     * @param page 页码
     * @param pageSize 每页数量
     */
    async getActionLogs(userId, operatorId, page = 1, pageSize = 20) {
      const filters = {};
      if (userId) {
        filters.targetUserId = userId;
      }
      if (operatorId) {
        filters.operatorId = operatorId;
      }
      const logs = await strapi2.db.query("plugin::zhao-auth.role-action-log").findMany({
        where: filters,
        orderBy: { timestamp: "desc" },
        offset: (page - 1) * pageSize,
        limit: pageSize
      });
      const total = await strapi2.db.query("plugin::zhao-auth.role-action-log").count({
        where: filters
      });
      return {
        data: logs,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    },
    /**
     * 检查用户是否具有特定权限（委托给 permission.service.getMyPermissions）
     * @param userId 用户ID
     * @param action 权限 key
     * @param tenantDocumentId 租户 documentId（可选）
     * @returns 是否具有权限
     */
    async checkPermission(userId, action, tenantDocumentId) {
      return checkPermission.call({ strapi: strapi2 }, userId, action, tenantDocumentId);
    },
    /**
     * 获取用户有效权限信息
     * @param userId 用户ID
     * @returns 用户权限信息
     */
    async getUserEffectivePermissions(userId) {
      return await getUserEffectivePermissions(userId);
    },
    /**
     * 清除用户权限缓存
     * @param userId 用户ID
     */
    async invalidateUserCache(userId) {
      invalidateUserCache(userId);
    },
    /**
     * 获取用户层级（取所有角色中的最高层级）
     * @param userId 用户ID
     * @returns 层级数值（1-100）
     */
    async getUserLevel(userId) {
      return getUserLevel(userId);
    },
    /**
     * 根据角色列表计算权限映射
     * @param roles 用户角色列表
     * @returns 角色和权限映射
     */
    computePermissions(roles) {
      const permissions2 = {};
      for (const role of roles) {
        const rolePerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
        for (const action of rolePerms) {
          permissions2[action] = true;
        }
      }
      return { roles, permissions: permissions2 };
    }
  };
};
const VISIBILITY_MODULES = [
  "website",
  "logistics",
  "studio",
  "points",
  "course",
  "quiz",
  "channel",
  "sso",
  "thirdParty",
  "oss",
  "payment",
  "community",
  "forum"
];
const DEFAULT_MODULE_VISIBILITY = {
  website: ["channel-admin", "plugin-manager", "website-manager", "website-editor"],
  logistics: ["channel-admin", "plugin-manager", "logistics-manager", "logistics-editor"],
  studio: ["channel-admin", "plugin-manager", "studio-manager", "studio-editor"],
  points: ["channel-admin", "plugin-manager", "point-manager", "point-editor"],
  course: ["channel-admin", "plugin-manager", "course-manager", "course-editor"],
  quiz: ["channel-admin", "plugin-manager", "quiz-manager", "quiz-editor"],
  channel: ["channel-admin", "plugin-manager", "marketing-manager"],
  sso: ["plugin-manager", "system-manager", "system-editor"],
  thirdParty: ["plugin-manager", "system-manager"],
  oss: ["plugin-manager", "system-manager"],
  payment: ["plugin-manager", "wealth-manager"],
  community: ["channel-admin", "plugin-manager", "marketing-manager"],
  forum: ["channel-admin", "plugin-manager", "marketing-manager"]
};
const PERMISSION_UID$1 = "plugin::zhao-auth.permission";
const USER_UID = "plugin::users-permissions.user";
const PERMISSION_CACHE_TTL = 6e4;
const permissionCache = /* @__PURE__ */ new Map();
function invalidatePermissionCache(userId, tenantDocumentId) {
  if (userId && tenantDocumentId) {
    permissionCache.delete(`${userId}|${tenantDocumentId}`);
  } else if (userId) {
    for (const key of [...permissionCache.keys()]) {
      if (key.startsWith(`${userId}|`)) permissionCache.delete(key);
    }
  } else if (tenantDocumentId) {
    for (const key of [...permissionCache.keys()]) {
      if (key.endsWith(`|${tenantDocumentId}`)) permissionCache.delete(key);
    }
  } else {
    permissionCache.clear();
  }
}
function normalizeRoleName$1(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, "-");
}
function findNode(key, tree) {
  for (const [k, node] of Object.entries(tree)) {
    if (k === key) return node;
    if (node?.children) {
      const found = findNode(key, node.children);
      if (found) return found;
    }
  }
  return null;
}
function expandPermissionKeys(keys) {
  const result = /* @__PURE__ */ new Set();
  for (const key of keys) {
    result.add(key);
    const found = findNode(key, PERMISSION_TREE);
    if (found?.children && found.type !== "menu") {
      flattenPermissions(found.children).forEach((k) => result.add(k));
    }
  }
  return Array.from(result);
}
const DEFAULT_SEED_VERSION = DEFAULT_ROLE_PERMISSIONS.__version || "";
async function initDefaultRoles(strapi2) {
  const results = [];
  for (const [role, defaultPerms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    if (role === "__version") continue;
    const existing = await strapi2.db.query(PERMISSION_UID$1).findOne({
      where: { role }
    });
    if (!existing) {
      await strapi2.documents(PERMISSION_UID$1).create({
        data: {
          role,
          displayName: ROLE_LABELS[role] || role,
          description: "",
          permissions: defaultPerms,
          isSystem: Object.values(ROLES).includes(role),
          seedVersion: DEFAULT_SEED_VERSION
        }
      });
      results.push(`${role}:created`);
    } else if (existing.isSystem && existing.seedVersion !== DEFAULT_SEED_VERSION) {
      await strapi2.db.query(PERMISSION_UID$1).update({
        where: { id: existing.id },
        data: {
          permissions: defaultPerms,
          seedVersion: DEFAULT_SEED_VERSION
        }
      });
      results.push(`${role}:re-seeded`);
    } else {
      results.push(`${role}:skipped`);
    }
  }
  return results;
}
const permissionService = ({ strapi: strapi2 }) => ({
  /**
   * 获取权限树定义
   */
  getPermissionTree() {
    return PERMISSION_TREE;
  },
  /**
   * 角色列表（分页）
   */
  async listRoles(page = 1, pageSize = 20, filters = {}) {
    const where = {};
    if (filters.role) where.role = { $contains: filters.role };
    const records = await strapi2.db.query(PERMISSION_UID$1).findMany({
      where,
      orderBy: { id: "asc" },
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    const total = await strapi2.db.query(PERMISSION_UID$1).count({ where });
    const list = records.map((r) => ({
      id: r.id,
      documentId: r.documentId,
      name: r.role,
      role: r.role,
      displayName: r.displayName || r.role,
      description: r.description || "",
      isSystem: !!r.isSystem,
      permissions: r.permissions || [],
      userCount: 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
    return {
      list,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize)
      }
    };
  },
  /**
   * 获取所有角色（不分页，用于下拉）
   */
  async getAllRoles() {
    const records = await strapi2.db.query(PERMISSION_UID$1).findMany({
      orderBy: { id: "asc" }
    });
    return records.map((r) => ({
      name: r.role,
      role: r.role,
      displayName: r.displayName || r.role,
      isSystem: !!r.isSystem
    }));
  },
  /**
   * 获取单个角色
   */
  async getRole(roleName) {
    const record = await strapi2.db.query(PERMISSION_UID$1).findOne({
      where: { role: roleName }
    });
    if (!record) return null;
    return {
      id: record.id,
      documentId: record.documentId,
      name: record.role,
      role: record.role,
      displayName: record.displayName || record.role,
      description: record.description || "",
      isSystem: !!record.isSystem,
      permissions: record.permissions || [],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  },
  /**
   * 创建角色
   */
  async createRole(data, operatorId, operatorLevel) {
    const role = normalizeRoleName$1(data.role);
    if (!role) {
      const e = new Error("角色名不能为空");
      e.status = 400;
      throw e;
    }
    const targetLevel = data.level ?? 20;
    if (operatorLevel < 100 && targetLevel >= operatorLevel) {
      const e = new Error("不能创建同级或更高层级角色");
      e.code = "ROLE_003";
      e.status = 403;
      throw e;
    }
    const existing = await strapi2.db.query(PERMISSION_UID$1).findOne({
      where: { role }
    });
    if (existing) {
      const e = new Error(`角色 ${role} 已存在`);
      e.status = 409;
      throw e;
    }
    if (operatorLevel < 100) {
      const operator = await strapi2.db.query(USER_UID).findOne({ where: { id: operatorId } });
      const operatorRoles = Array.isArray(operator?.zhaoRoles) ? operator.zhaoRoles : [];
      if (!operatorRoles.includes("admin")) {
        const operatorPermsResult = await this.getMyPermissions(operatorId);
        const operatorPerms = new Set(operatorPermsResult.permissions);
        const requestedPerms = Array.isArray(data.permissions) ? data.permissions : [];
        const unauthorizedPerms = requestedPerms.filter((p) => !operatorPerms.has(p));
        if (unauthorizedPerms.length > 0) {
          const e = new Error(
            `不能创建包含超出自身权限的角色，未授权权限：${unauthorizedPerms.join(", ")}`
          );
          e.code = "PERM_010";
          e.status = 403;
          throw e;
        }
      }
    }
    const created = await strapi2.documents(PERMISSION_UID$1).create({
      data: {
        role,
        displayName: data.displayName || role,
        description: data.description || "",
        permissions: data.permissions || [],
        isSystem: !!data.isSystem,
        level: targetLevel
      }
    });
    return {
      id: created.id,
      documentId: created.documentId,
      name: created.role,
      role: created.role,
      displayName: created.displayName,
      description: created.description || "",
      isSystem: !!created.isSystem,
      permissions: created.permissions || [],
      level: created.level ?? targetLevel
    };
  },
  /**
   * 更新角色
   */
  async updateRole(roleName, data) {
    const existing = await strapi2.db.query(PERMISSION_UID$1).findOne({
      where: { role: roleName }
    });
    if (!existing) {
      const e = new Error(`角色 ${roleName} 不存在`);
      e.status = 404;
      throw e;
    }
    const updateData = {};
    if (data.displayName !== void 0) updateData.displayName = data.displayName;
    if (data.description !== void 0) updateData.description = data.description;
    if (data.permissions !== void 0) updateData.permissions = data.permissions;
    const updated = await strapi2.documents(PERMISSION_UID$1).update({
      documentId: existing.documentId,
      data: updateData
    });
    return {
      id: updated.id,
      documentId: updated.documentId,
      name: updated.role,
      role: updated.role,
      displayName: updated.displayName,
      description: updated.description || "",
      isSystem: !!updated.isSystem,
      permissions: updated.permissions || []
    };
  },
  /**
   * 删除角色（系统角色不允许删除）
   */
  async deleteRole(roleName) {
    const existing = await strapi2.db.query(PERMISSION_UID$1).findOne({
      where: { role: roleName }
    });
    if (!existing) {
      const e = new Error(`角色 ${roleName} 不存在`);
      e.status = 404;
      throw e;
    }
    if (existing.isSystem) {
      const e = new Error("系统角色不允许删除");
      e.status = 400;
      throw e;
    }
    await strapi2.documents(PERMISSION_UID$1).delete({ documentId: existing.documentId });
    return { success: true, role: roleName };
  },
  /**
   * 获取某角色权限
   */
  async getRolePermissions(role) {
    const record = await strapi2.db.query(PERMISSION_UID$1).findOne({
      where: { role }
    });
    if (!record) {
      const defaults = DEFAULT_ROLE_PERMISSIONS[role];
      return { role, permissions: defaults || [] };
    }
    return { role, permissions: record.permissions || [] };
  },
  /**
   * 更新某角色权限
   */
  async updateRolePermissions(role, permissionKeys) {
    const existing = await strapi2.db.query(PERMISSION_UID$1).findOne({
      where: { role }
    });
    if (existing) {
      const updated = await strapi2.documents(PERMISSION_UID$1).update({
        documentId: existing.documentId,
        data: { permissions: permissionKeys }
      });
      return { role, permissions: updated.permissions };
    }
    const created = await strapi2.documents(PERMISSION_UID$1).create({
      data: {
        role,
        displayName: ROLE_LABELS[role] || role,
        description: "",
        permissions: permissionKeys,
        isSystem: Object.values(ROLES).includes(role)
      }
    });
    return { role, permissions: created.permissions };
  },
  /**
   * 获取当前用户的所有权限
   */
  async getMyPermissions(userId, tenantDocumentId) {
    const cacheKey = `${userId}|${tenantDocumentId || "global"}`;
    const cached = permissionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PERMISSION_CACHE_TTL) {
      return { permissions: cached.data };
    }
    const user = await strapi2.db.query(USER_UID).findOne({
      where: { id: userId },
      select: ["id", "zhaoRoles"],
      populate: ["role"]
    });
    if (!user) return { permissions: [] };
    let userRoles = [];
    if (Array.isArray(user.zhaoRoles) && user.zhaoRoles.length > 0) {
      userRoles = user.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((r) => r && r.trim());
    } else if (user.role) {
      const roleObj = user.role;
      if (Array.isArray(roleObj)) {
        userRoles = roleObj.map((r) => r?.type).filter((type) => type && type.trim());
      } else if (roleObj.type) {
        userRoles = [roleObj.type];
      } else if (roleObj.name) {
        userRoles = [roleObj.name];
      }
    }
    if (userRoles.length === 0) return { permissions: [] };
    if (userRoles.includes("admin")) {
      const allPerms = flattenPermissions(PERMISSION_TREE);
      permissionCache.set(cacheKey, { data: allPerms, timestamp: Date.now() });
      return { permissions: allPerms };
    }
    const allExpanded = /* @__PURE__ */ new Set();
    for (const roleName of userRoles) {
      try {
        const record = await strapi2.db.query(PERMISSION_UID$1).findOne({
          where: { role: roleName }
        });
        if (record?.permissions && Array.isArray(record.permissions)) {
          expandPermissionKeys(record.permissions).forEach(
            (k) => allExpanded.add(k)
          );
        } else {
          const defaults = DEFAULT_ROLE_PERMISSIONS[roleName] || [];
          expandPermissionKeys(defaults).forEach((k) => allExpanded.add(k));
        }
      } catch {
      }
    }
    if (userRoles.includes(ROLES.CHANNEL_ADMIN)) {
      const moduleVisibility2 = await this.resolveModuleVisibility(tenantDocumentId);
      for (const [moduleKey, roles] of Object.entries(moduleVisibility2)) {
        if (roles.includes(ROLES.CHANNEL_ADMIN)) {
          const managerRole = MODULE_MANAGER_MAP[moduleKey];
          if (managerRole) {
            try {
              const record = await strapi2.db.query(PERMISSION_UID$1).findOne({
                where: { role: managerRole }
              });
              const managerPerms = record?.permissions || DEFAULT_ROLE_PERMISSIONS[managerRole] || [];
              expandPermissionKeys(managerPerms).forEach((k) => allExpanded.add(k));
            } catch {
              const defaults = DEFAULT_ROLE_PERMISSIONS[managerRole] || [];
              expandPermissionKeys(defaults).forEach((k) => allExpanded.add(k));
            }
          }
        }
      }
    }
    const result = Array.from(allExpanded);
    permissionCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return { permissions: result };
  },
  /**
   * 解析合并后的 moduleVisibility（全局默认 ∩ 租户覆盖，交集收窄）
   */
  async resolveModuleVisibility(tenantDocumentId) {
    let globalVisibility = {};
    try {
      const globalConfig = await strapi2.plugin("zhao-common").service("global-config").getGlobalConfig();
      globalVisibility = globalConfig?.moduleVisibility ?? {};
    } catch {
    }
    let tenantVisibility = {};
    if (tenantDocumentId) {
      try {
        const siteConfig = await strapi2.plugin("zhao-common").service("site-config").getConfig(tenantDocumentId);
        tenantVisibility = siteConfig?.moduleVisibility ?? {};
      } catch {
      }
    }
    const merged = {};
    for (const moduleKey of VISIBILITY_MODULES) {
      const globalRoles = globalVisibility[moduleKey] ?? DEFAULT_MODULE_VISIBILITY[moduleKey] ?? [];
      const tenantRoles = tenantVisibility[moduleKey];
      merged[moduleKey] = tenantRoles ? globalRoles.filter((r) => tenantRoles.includes(r)) : globalRoles;
    }
    return merged;
  },
  /**
   * 失效权限缓存（代理方法，供外部通过 strapi.plugin().service() 调用）
   */
  invalidateCache(userId, tenantDocumentId) {
    invalidatePermissionCache(userId, tenantDocumentId);
  },
  /**
   * 初始化并同步默认角色权限（每次启动时调用）
   * 委托给模块级命名导出函数，按 seedVersion 决定是否覆盖权限
   */
  async initDefaultRoles() {
    return initDefaultRoles(strapi2);
  }
});
const channelScopeService = ({ strapi: strapi2 }) => ({
  /**
   * 解析用户可见渠道范围
   * @param user 用户对象（含 id, roles）
   * @returns ChannelScope
   */
  async resolve(user) {
    const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : Array.isArray(user.zhaoRoles) ? user.zhaoRoles : [];
    if (userRoles.includes("admin")) {
      return { all: true, channelIds: [] };
    }
    try {
      const channelPermService = strapi2.plugin("zhao-channel").service("channel-permission");
      const channelIds = await channelPermService.getUserAllChannels(user.id);
      return { all: false, channelIds };
    } catch (err) {
      strapi2.log.warn(`[zhao-auth:channel-scope] zhao-channel 服务不可用: ${err.message}`);
      return { all: false, channelIds: [] };
    }
  },
  /**
   * 构造 filters 中的 channel 过滤条件（纯函数，不调用 resolve）
   * @param scope 渠道范围（来自 ctx.state.channelScope）
   * @param field 关系字段名："channel"（manyToOne）/ "channels"（manyToMany）/ "id"（channel 自身）
   * @returns 过滤条件对象；null 表示不过滤
   */
  buildChannelFilter(scope, field) {
    if (!scope) return null;
    if (scope.all) return null;
    const ids = Array.isArray(scope.channelIds) ? scope.channelIds : [];
    const idList = ids.length === 0 ? [-1] : ids;
    if (field === "id") {
      return { id: { $in: idList } };
    }
    return { [field]: { id: { $in: idList } } };
  },
  /**
   * 校验单条记录的 channel 关系是否在 scope 内（纯函数）
   * @param scope 渠道范围
   * @param record 含 channel 关系的记录
   * @param field 关系字段名："channel"（对象）/ "channels"（数组）/ "id"（channel 自身，数字）
   * @throws 403 当记录的 channel 不在 scope 内
   */
  assertRecordInScope(scope, record, field) {
    if (!scope || scope.all) return;
    const rel = record?.[field];
    if (rel == null) return;
    const allowed = Array.isArray(scope.channelIds) ? scope.channelIds : [];
    let recordChannelIds = [];
    if (Array.isArray(rel)) {
      recordChannelIds = rel.map((c) => typeof c === "number" ? c : c?.id).filter((id) => typeof id === "number");
    } else if (typeof rel === "number") {
      recordChannelIds = [rel];
    } else if (typeof rel === "object" && rel != null) {
      if (typeof rel.id === "number") recordChannelIds = [rel.id];
    }
    if (recordChannelIds.length === 0) return;
    const hasIntersection = recordChannelIds.some((id) => allowed.includes(id));
    if (!hasIntersection) {
      const e = new Error("无权访问该渠道的数据");
      e.status = 403;
      throw e;
    }
  },
  /**
   * 通过 channel documentId 校验是否在 scope 内（async，需查 DB）
   * @param scope 渠道范围
   * @param channelDocumentId channel 的 documentId
   * @throws 403 当 channel 不在 scope 内
   */
  async assertChannelDocIdInScope(scope, channelDocumentId) {
    if (!scope || scope.all) return;
    if (!channelDocumentId) return;
    const channel = await strapi2.db.query("plugin::zhao-channel.channel").findOne({
      where: { documentId: channelDocumentId },
      select: ["id"]
    });
    if (!channel) return;
    this.assertRecordInScope(scope, channel, "id");
  },
  /**
   * 构造嵌套关系过滤条件（纯函数，用于间接渠道关联）
   * @param scope 渠道范围
   * @param path 关系路径数组，如 ["course", "channel"] 生成 { course: { channel: { id: { $in: ids } } } }
   * @returns 过滤条件对象；null 表示不过滤
   */
  buildChannelFilterDeep(scope, path) {
    if (!scope) return null;
    if (scope.all) return null;
    if (!Array.isArray(path) || path.length === 0) return null;
    const ids = Array.isArray(scope.channelIds) ? scope.channelIds : [];
    const idList = ids.length === 0 ? [-1] : ids;
    let filter = { id: { $in: idList } };
    for (let i = path.length - 1; i >= 0; i--) {
      filter = { [path[i]]: filter };
    }
    return filter;
  }
});
const UID = "plugin::zhao-auth.role-channel";
const CHANNEL_UID = "plugin::zhao-channel.channel";
const roleChannelService = ({ strapi: strapi2 }) => ({
  /**
   * 角色渠道列表（分页）
   */
  async listRoleChannels(page = 1, pageSize = 20, filters = {}) {
    const where = {};
    if (filters.role) where.role = { $contains: filters.role };
    const records = await strapi2.db.query(UID).findMany({
      where,
      populate: { channel: true, grantedBy: true },
      orderBy: { id: "asc" },
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    const total = await strapi2.db.query(UID).count({ where });
    const list = records.map((r) => ({
      id: r.id,
      role: r.role,
      channel: r.channel ? { id: r.channel.id, name: r.channel.name, code: r.channel.code } : null,
      grantedBy: r.grantedBy ? { id: r.grantedBy.id, username: r.grantedBy.username } : null,
      createdAt: r.createdAt
    }));
    return {
      list,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize)
      }
    };
  },
  /**
   * 查询角色被授权的所有渠道 ID
   */
  async getRoleChannelIds(roles) {
    if (!roles || roles.length === 0) return [];
    const records = await strapi2.db.query(UID).findMany({
      where: { role: { $in: roles } },
      populate: { channel: true }
    });
    const channelIds = /* @__PURE__ */ new Set();
    for (const r of records) {
      if (r.channel?.id) channelIds.add(r.channel.id);
    }
    return Array.from(channelIds);
  },
  /**
   * 授权角色渠道（单个）
   */
  async grant(data) {
    const role = data.role.trim();
    if (!role) {
      const e = new Error("角色名不能为空");
      e.status = 400;
      throw e;
    }
    const channel = await strapi2.db.query(CHANNEL_UID).findOne({
      where: { id: data.channelId }
    });
    if (!channel) {
      const e = new Error("渠道不存在");
      e.status = 404;
      throw e;
    }
    const existing = await strapi2.db.query(UID).findOne({
      where: { role, channel: { id: data.channelId } }
    });
    if (existing) {
      return {
        id: existing.id,
        role: existing.role,
        channel: { id: data.channelId, name: channel.name, code: channel.code }
      };
    }
    const created = await strapi2.db.query(UID).create({
      data: {
        role,
        channel: data.channelId,
        grantedBy: data.grantedBy || null
      },
      populate: { channel: true, grantedBy: true }
    });
    return {
      id: created.id,
      role: created.role,
      channel: created.channel ? { id: created.channel.id, name: created.channel.name, code: created.channel.code } : null,
      grantedBy: created.grantedBy ? { id: created.grantedBy.id, username: created.grantedBy.username } : null,
      createdAt: created.createdAt
    };
  },
  /**
   * 批量授权
   */
  async batchGrant(data) {
    const role = data.role.trim();
    if (!role) {
      const e = new Error("角色名不能为空");
      e.status = 400;
      throw e;
    }
    if (!data.channelIds || data.channelIds.length === 0) {
      const e = new Error("channelIds 不能为空");
      e.status = 400;
      throw e;
    }
    const results = [];
    for (const channelId of data.channelIds) {
      try {
        const r = await this.grant({
          role,
          channelId,
          grantedBy: data.grantedBy
        });
        results.push({ success: true, channelId, result: r });
      } catch (err) {
        results.push({ success: false, channelId, error: err.message });
      }
    }
    return { results };
  },
  /**
   * 撤销角色渠道
   */
  async revoke(id) {
    const existing = await strapi2.db.query(UID).findOne({
      where: { id }
    });
    if (!existing) {
      const e = new Error("记录不存在");
      e.status = 404;
      throw e;
    }
    await strapi2.db.query(UID).delete({ where: { id } });
    return { success: true, id, role: existing.role };
  },
  /**
   * 按角色名删除
   */
  async revokeByRole(role) {
    const records = await strapi2.db.query(UID).findMany({
      where: { role }
    });
    for (const r of records) {
      await strapi2.db.query(UID).delete({ where: { id: r.id } });
    }
    return { success: true, role, deleted: records.length };
  }
});
const SITE_CONFIG_UID = "plugin::zhao-common.site-config";
const tenantService = ({ strapi: strapi2 }) => ({
  async getMyTenants(userId, roles) {
    if (roles.includes("admin")) {
      const all = await strapi2.db.query(SITE_CONFIG_UID).findMany({
        select: ["id", "documentId", "siteName", "domain"],
        limit: 1e3
      });
      return all.map((s) => ({
        id: s.id,
        documentId: s.documentId,
        name: s.siteName,
        domain: s.domain
      }));
    }
    let channelIds = [];
    try {
      const channelPermission = strapi2.plugin("zhao-channel").service("channel-permission");
      const userChannels = await channelPermission.getUserAllChannels(userId);
      channelIds = (userChannels || []).filter(
        (id) => typeof id === "number"
      );
    } catch (e) {
      strapi2.log.warn(
        `[tenant] failed to get user channels: ${e?.message || e}`
      );
    }
    if (channelIds.length === 0) return [];
    const links = await strapi2.db.connection("zhao_channels_sites_lnk").whereIn("channel_id", channelIds).select("site_config_id");
    const siteIds = [
      ...new Set(links.map((l) => l.site_config_id))
    ].filter(Boolean);
    if (siteIds.length === 0) return [];
    const sites = await strapi2.db.query(SITE_CONFIG_UID).findMany({
      where: { id: { $in: siteIds } },
      select: ["id", "documentId", "siteName", "domain"]
    });
    return sites.map((s) => ({
      id: s.id,
      documentId: s.documentId,
      name: s.siteName,
      domain: s.domain
    }));
  }
});
const permissionCheckService = ({ strapi: strapi2 }) => ({
  async checkPermission(userId, action, tenantDocumentId) {
    const reasons = [];
    const result = await strapi2.plugin("zhao-auth").service("permission").getMyPermissions(userId, tenantDocumentId);
    const permissions2 = Array.isArray(result) ? result : result?.permissions ?? [];
    if (permissions2.includes(action)) {
      return { allowed: true, reasons: ["Permission granted"] };
    }
    reasons.push(`Action "${action}" not in user's permissions`);
    reasons.push(`User has ${permissions2.length} permissions`);
    return { allowed: false, reasons };
  }
});
const services = {
  auth: authService,
  jwt: jwtService,
  "role-management": roleManagementService,
  permission: permissionService,
  "channel-scope": channelScopeService,
  "role-channel": roleChannelService,
  tenant: tenantService,
  "permission-check": permissionCheckService
};
const middlewares = {};
const roleManagementController = ({ strapi: strapi2 }) => ({
  async findUsers(ctx) {
    try {
      const {
        page = 1,
        pageSize = 20,
        "pagination[page]": paginationPage,
        "pagination[pageSize]": paginationPageSize,
        ...filters
      } = ctx.query;
      const actualPage = parseInt(paginationPage || page, 10);
      const actualPageSize = parseInt(paginationPageSize || pageSize, 10);
      const operatorId = ctx.state.user?.id;
      const tenantDocumentId = ctx.state.siteDocumentId;
      const result = await strapi2.plugin("zhao-auth").service("role-management").findUsers(
        filters,
        actualPage,
        actualPageSize,
        operatorId,
        tenantDocumentId
      );
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Find users failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async assignRole(ctx) {
    try {
      const { userId, role, reason } = ctx.request.body;
      const operatorId = ctx.state.user?.id;
      const operatorTenantDocumentId = ctx.state.siteDocumentId;
      if (!userId || !role) {
        ctx.status = 400;
        ctx.body = { error: "缺少必要参数: userId 和 role" };
        return;
      }
      if (!operatorId) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-management").assignRole(userId, role, operatorId, reason, operatorTenantDocumentId);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Assign role failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async revokeRole(ctx) {
    try {
      const { userId, role, reason } = ctx.request.body;
      const operatorId = ctx.state.user?.id;
      const operatorTenantDocumentId = ctx.state.siteDocumentId;
      if (!userId || !role) {
        ctx.status = 400;
        ctx.body = { error: "缺少必要参数: userId 和 role" };
        return;
      }
      if (!operatorId) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-management").revokeRole(userId, role, operatorId, reason, operatorTenantDocumentId);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Revoke role failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async getUserRoles(ctx) {
    try {
      const userId = parseInt(ctx.params.id, 10);
      if (isNaN(userId)) {
        ctx.status = 400;
        ctx.body = { error: "无效的用户ID" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-management").getUserRoles(userId);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Get user roles failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async batchAssignRoles(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { userIds, role, reason } = body;
      const operatorId = ctx.state.user?.id;
      const operatorTenantDocumentId = ctx.state.siteDocumentId;
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        ctx.status = 400;
        ctx.body = { error: "缺少必要参数: userIds 必须是非空数组" };
        return;
      }
      if (!role) {
        ctx.status = 400;
        ctx.body = { error: "缺少必要参数: role" };
        return;
      }
      if (!operatorId) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-management").batchAssignRoles(userIds, role, operatorId, reason, operatorTenantDocumentId);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Batch assign roles failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async getActionLogs(ctx) {
    try {
      const {
        userId,
        operatorId,
        page = 1,
        pageSize = 20,
        "pagination[page]": paginationPage,
        "pagination[pageSize]": paginationPageSize
      } = ctx.query;
      const actualPage = parseInt(paginationPage || page, 10);
      const actualPageSize = parseInt(paginationPageSize || pageSize, 10);
      const result = await strapi2.plugin("zhao-auth").service("role-management").getActionLogs(
        userId ? parseInt(userId, 10) : void 0,
        operatorId ? parseInt(operatorId, 10) : void 0,
        actualPage,
        actualPageSize
      );
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Get action logs failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async getMyRoles(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-management").getUserRoles(userId);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Get my roles failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async getMyPermissions(ctx) {
    try {
      const user = ctx.state.user;
      if (!user?.id) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const roles = user.roles || [];
      ctx.body = strapi2.plugin("zhao-auth").service("role-management").computePermissions(roles);
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Get my permissions failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async getUserDetail(ctx) {
    try {
      const userId = parseInt(ctx.params.id, 10);
      if (isNaN(userId)) {
        ctx.status = 400;
        ctx.body = { error: "无效的用户ID" };
        return;
      }
      const operatorId = ctx.state.user?.id;
      const tenantDocumentId = ctx.state.siteDocumentId;
      const result = await strapi2.plugin("zhao-auth").service("role-management").getUserDetail(userId, operatorId, tenantDocumentId);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Get user detail failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async getAssignableRoles(ctx) {
    try {
      const operatorId = ctx.state.user?.id;
      const tenantDocumentId = ctx.state.siteDocumentId;
      if (!operatorId) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-management").getAssignableRoles(operatorId, tenantDocumentId);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Get assignable roles failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async me(ctx) {
    try {
      const user = ctx.state?.user || ctx.state?.auth?.credentials;
      if (!user) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const userId = user.id;
      const permissionsResult = await strapi2.plugin("zhao-auth").service("permission").getMyPermissions(userId);
      const permissions2 = Array.isArray(permissionsResult) ? permissionsResult : permissionsResult?.permissions ?? [];
      const userRoles = await strapi2.plugin("zhao-auth").service("role-management").getUserRoles(userId);
      let channelScope = { all: true, channelIds: [] };
      try {
        channelScope = await strapi2.plugin("zhao-channel").service("channel-scope").resolve(user);
      } catch {
      }
      ctx.body = {
        user: { id: user.id, username: user.username, zhaoRoles: userRoles },
        permissions: permissions2,
        channelScope,
        tenant: ctx.state?.siteDocumentId ? { documentId: ctx.state.siteDocumentId } : null
      };
    } catch (error) {
      strapi2.log.error(`[zhao-auth] me failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  }
});
const authController = ({ strapi: strapi2 }) => ({
  async register(ctx) {
    try {
      const { username, email, password, inviteCode } = ctx.request.body;
      if (!username || !email || !password) {
        ctx.status = 400;
        ctx.body = { error: "请提供 username, email 和 password" };
        return;
      }
      if (password.length < 6) {
        ctx.status = 400;
        ctx.body = { error: "密码长度至少6位" };
        return;
      }
      const authService2 = strapi2.plugin("zhao-auth").service("auth");
      const existingUser = await authService2.findUserByIdentifier(username, email);
      if (existingUser) {
        if (existingUser.username === username) {
          ctx.status = 400;
          ctx.body = { error: "用户名已存在" };
          return;
        }
        ctx.status = 400;
        ctx.body = { error: "邮箱已被注册" };
        return;
      }
      const user = await authService2.createUser({ username, email, password });
      let inviteInfo = null;
      try {
        const channelService = strapi2.service("plugin::zhao-channel.user-invite");
        if (channelService && typeof channelService.createForUser === "function") {
          inviteInfo = await channelService.createForUser(user.id, inviteCode);
        }
      } catch (e) {
        strapi2.log.warn(`[zhao-auth] 创建邀请码失败: ${e.message}`);
      }
      const jwtService2 = strapi2.plugin("zhao-auth").service("jwt");
      const jwt2 = await jwtService2.sign({ id: user.id, email: user.email, username: user.username, zhaoRoles: ["user"] });
      ctx.status = 201;
      ctx.body = {
        jwt: jwt2,
        user: { id: user.id, username: user.username, email: user.email },
        inviteInfo: inviteInfo ? strapi2.service("plugin::zhao-channel.user-invite")?.formatInviteInfo?.(inviteInfo) || null : null
      };
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Register failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async resetPassword(ctx) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { identifier, password } = body;
    if (!identifier || !password) {
      ctx.status = 400;
      ctx.body = { error: "请提供 identifier 和 password" };
      return;
    }
    if (password.length < 6) {
      ctx.status = 400;
      ctx.body = { error: "密码长度至少 6 位" };
      return;
    }
    try {
      const authService2 = strapi2.plugin("zhao-auth").service("auth");
      const user = await authService2.findUserByIdentifier(identifier, identifier);
      if (!user) {
        ctx.status = 400;
        ctx.body = { error: "用户不存在" };
        return;
      }
      await authService2.updateUserPassword(user.id, password);
      ctx.body = { success: true, message: "密码重置成功" };
    } catch (error) {
      strapi2.log.error(`[zhao-auth] 重置密码失败：${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: "密码重置失败，请稍后重试" };
    }
  },
  async adminLocal(ctx) {
    try {
      const { identifier, password } = ctx.request.body;
      if (!identifier || !password) {
        ctx.status = 400;
        ctx.body = { error: "请提供 identifier 和 password" };
        return;
      }
      const authService2 = strapi2.plugin("zhao-auth").service("auth");
      const result = await authService2.localLogin(identifier, password);
      if (!result.success) {
        ctx.status = 400;
        ctx.body = { error: result.error };
        return;
      }
      const { user, roles, formattedRole } = result;
      const isSuperAdmin = roles.some(
        (r) => r === "super-admin" || r === "super_admin" || r === "SUPER_ADMIN"
      );
      if (!isSuperAdmin) {
        const permService = strapi2.plugin("zhao-auth").service("permission");
        const { permissions: permissions2 } = await permService.getMyPermissions(user.id);
        if (!permissions2.includes("auth.admin-login")) {
          ctx.status = 403;
          ctx.body = { error: "无管理后台访问权限" };
          return;
        }
      }
      const jwtService2 = strapi2.plugin("zhao-auth").service("jwt");
      const jwt2 = await jwtService2.sign({ id: user.id, email: user.email, username: user.username, zhaoRoles: roles });
      ctx.body = {
        jwt: jwt2,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: formattedRole
        }
      };
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Admin login failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async login(ctx) {
    try {
      const authService2 = strapi2.plugin("zhao-auth").service("auth");
      const sso = await authService2.isSsoEnabled();
      if (sso.enabled) {
        ctx.body = { mode: "sso", sso_login_url: sso.loginUrl, message: "SSO 认证已启用，请通过 SSO 登录" };
        return;
      }
      const { identifier, password } = ctx.request.body;
      if (!identifier || !password) {
        ctx.status = 400;
        ctx.body = { error: "请提供 identifier 和 password" };
        return;
      }
      const result = await authService2.localLogin(identifier, password);
      if (!result.success) {
        ctx.status = 400;
        ctx.body = { error: result.error };
        return;
      }
      const { user, roles, formattedRole } = result;
      const jwtService2 = strapi2.plugin("zhao-auth").service("jwt");
      const jwt2 = await jwtService2.sign({ id: user.id, email: user.email, username: user.username, zhaoRoles: roles });
      let inviteCode = null;
      try {
        const channelService = strapi2.service("plugin::zhao-channel.user-invite");
        if (channelService && typeof channelService.createForUser === "function") {
          const inviteInfo = await channelService.createForUser(user.id);
          inviteCode = inviteInfo?.inviteCode || null;
        }
      } catch (e) {
        strapi2.log.warn(`[zhao-auth] 登录时创建邀请码失败: ${e.message}`);
      }
      ctx.body = {
        jwt: jwt2,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: formattedRole
        },
        inviteCode
      };
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Login failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async config(ctx) {
    try {
      const authService2 = strapi2.plugin("zhao-auth").service("auth");
      const sso = await authService2.isSsoEnabled();
      const thirdEnabled = await this.checkThirdPartyEnabled();
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
        registerEnabled: true
      };
    } catch (e) {
      strapi2.log.error("[zhao-auth] Failed to get auth config:", e);
      ctx.body = {
        mode: "local",
        methods: ["password"],
        ssoLoginUrl: null,
        wechatEnabled: false,
        registerEnabled: true
      };
    }
  },
  async checkThirdPartyEnabled() {
    try {
      const flag = await strapi2.documents("plugin::zhao-common.feature-flag").findFirst({
        filters: { flagKey: "third_party_enabled" }
      });
      return !!(flag && flag.flagValue === true && flag.enabled !== false);
    } catch {
      return false;
    }
  },
  async switchTenant(ctx) {
    try {
      const user = ctx.state?.user;
      if (!user?.id) {
        ctx.status = 401;
        ctx.body = { error: "未登录" };
        return;
      }
      const body = ctx.request.body?.data || ctx.request.body;
      const { tenantId } = body;
      if (!tenantId) {
        ctx.status = 400;
        ctx.body = { error: "请提供 tenantId" };
        return;
      }
      const roles = Array.isArray(user.roles) ? user.roles : Array.isArray(user.zhaoRoles) ? user.zhaoRoles : [];
      const tenantService2 = strapi2.plugin("zhao-auth").service("tenant");
      const tenants = await tenantService2.getMyTenants(user.id, roles);
      const hasAccess = tenants.some(
        (t) => t.documentId === tenantId || String(t.id) === String(tenantId)
      );
      if (!hasAccess) {
        ctx.status = 403;
        ctx.body = { error: "无权访问该租户" };
        return;
      }
      const jwtService2 = strapi2.plugin("zhao-auth").service("jwt");
      const jwt2 = await jwtService2.sign({
        id: user.id,
        email: user.email,
        username: user.username,
        zhaoRoles: roles,
        currentTenantId: tenantId
      });
      try {
        const { invalidatePermissionCache: invalidatePermissionCache2 } = require("../services/permission.service");
        invalidatePermissionCache2(user.id);
      } catch {
      }
      ctx.body = {
        jwt: jwt2,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          currentTenantId: tenantId
        }
      };
    } catch (error) {
      strapi2.log.error(`[zhao-auth] switchTenant failed: ${error.message}`);
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }
});
const permissionController = ({ strapi: strapi2 }) => ({
  /**
   * GET /permissions/tree
   */
  async getTree(ctx) {
    try {
      const tree = strapi2.plugin("zhao-auth").service("permission").getPermissionTree();
      ctx.body = tree;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * GET /roles — 角色列表
   */
  async listRoles(ctx) {
    try {
      const { page = 1, pageSize = 20, role } = ctx.query;
      const result = await strapi2.plugin("zhao-auth").service("permission").listRoles(parseInt(page, 10), parseInt(pageSize, 10), { role });
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * GET /roles/all — 全部角色（下拉用）
   */
  async getAllRoles(ctx) {
    try {
      const result = await strapi2.plugin("zhao-auth").service("permission").getAllRoles();
      ctx.body = { list: result };
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * GET /roles/:role — 获取单个角色
   */
  async getRole(ctx) {
    try {
      const { role } = ctx.params;
      const result = await strapi2.plugin("zhao-auth").service("permission").getRole(role);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "角色不存在" };
        return;
      }
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * POST /roles — 创建角色
   */
  async createRole(ctx) {
    try {
      const { role, displayName, description, permissions: permissions2, level } = ctx.request.body;
      if (!role || !displayName) {
        ctx.status = 400;
        ctx.body = { error: "角色名和显示名称必填" };
        return;
      }
      const operatorId = ctx.state?.user?.id;
      if (!operatorId) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const operatorLevel = await strapi2.plugin("zhao-auth").service("role-management").getUserLevel(operatorId);
      const result = await strapi2.plugin("zhao-auth").service("permission").createRole(
        {
          role,
          displayName,
          description,
          permissions: Array.isArray(permissions2) ? permissions2 : [],
          level: typeof level === "number" ? level : void 0
        },
        operatorId,
        operatorLevel
      );
      ctx.status = 201;
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * PUT /roles/:role — 更新角色
   */
  async updateRole(ctx) {
    try {
      const { role } = ctx.params;
      const { displayName, description, permissions: permissions2 } = ctx.request.body;
      const result = await strapi2.plugin("zhao-auth").service("permission").updateRole(role, { displayName, description, permissions: permissions2 });
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * DELETE /roles/:role — 删除角色
   */
  async deleteRole(ctx) {
    try {
      const { role } = ctx.params;
      const result = await strapi2.plugin("zhao-auth").service("permission").deleteRole(role);
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * GET /permissions/role/:role
   */
  async getRolePermissions(ctx) {
    try {
      const { role } = ctx.params;
      if (!role) {
        ctx.status = 400;
        ctx.body = { error: "缺少角色参数" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("permission").getRolePermissions(role);
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * PUT /permissions/role/:role
   */
  async updateRolePermissions(ctx) {
    try {
      const { role } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const { permissions: permissions2 } = body;
      if (!role) {
        ctx.status = 400;
        ctx.body = { error: "缺少角色参数" };
        return;
      }
      if (!Array.isArray(permissions2)) {
        ctx.status = 400;
        ctx.body = { error: "permissions 必须是数组" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("permission").updateRolePermissions(role, permissions2);
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * POST /permissions/init — 初始化默认角色
   */
  async initRoles(ctx) {
    try {
      const results = await strapi2.plugin("zhao-auth").service("permission").initDefaultRoles();
      ctx.body = { results };
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * GET /my/permissions — 获取当前用户权限
   */
  async getMyPermissions(ctx) {
    try {
      const userId = ctx.state?.user?.id;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("permission").getMyPermissions(userId, ctx.state?.siteDocumentId);
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * GET /my/channel-scope
   */
  async getMyChannelScope(ctx) {
    try {
      const user = ctx.state?.user;
      if (!user?.id) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const channelScopeService2 = strapi2.plugin("zhao-auth").service("channel-scope");
      const scope = await channelScopeService2.resolve(user);
      ctx.body = scope;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  }
});
const roleChannelController = ({ strapi: strapi2 }) => ({
  /**
   * GET /admin/role-channels — 列表
   */
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20, role } = ctx.query;
      const result = await strapi2.plugin("zhao-auth").service("role-channel").listRoleChannels(parseInt(page, 10), parseInt(pageSize, 10), { role });
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * POST /admin/role-channels — 授权角色渠道（单个）
   */
  async grant(ctx) {
    try {
      const { role, channelId, grantedBy } = ctx.request.body;
      if (!role || !channelId) {
        ctx.status = 400;
        ctx.body = { error: "role 和 channelId 必填" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-channel").grant({ role, channelId: parseInt(channelId, 10), grantedBy });
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * POST /admin/role-channels/batch — 批量授权
   */
  async batchGrant(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { role, channelIds, grantedBy } = body;
      if (!role || !channelIds) {
        ctx.status = 400;
        ctx.body = { error: "role 和 channelIds 必填" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-channel").batchGrant({ role, channelIds, grantedBy });
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * DELETE /admin/role-channels/:id — 撤销授权
   */
  async revoke(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi2.plugin("zhao-auth").service("role-channel").revoke(parseInt(id, 10));
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * DELETE /admin/role-channels/role/:role — 按角色删除所有渠道授权
   */
  async revokeByRole(ctx) {
    try {
      const { role } = ctx.params;
      const result = await strapi2.plugin("zhao-auth").service("role-channel").revokeByRole(role);
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  }
});
const tenantController = ({ strapi: strapi2 }) => ({
  async getMyTenants(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        ctx.status = 401;
        ctx.body = { error: "未登录" };
        return;
      }
      const roles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : Array.isArray(user.zhaoRoles) ? user.zhaoRoles : [];
      const tenants = await strapi2.plugin("zhao-auth").service("tenant").getMyTenants(user.id, roles);
      ctx.body = { data: tenants };
    } catch (err) {
      strapi2.log.error(`[zhao-auth] Get my tenants failed: ${err.message}`);
      ctx.status = err.status || 400;
      ctx.body = { error: err.message, code: err.code };
    }
  }
});
const VALID_ROLES = new Set(Object.values(ROLES));
const moduleVisibilityController = {
  async get(ctx) {
    const siteId = ctx.state?.siteDocumentId;
    if (!siteId) {
      ctx.status = 400;
      ctx.body = { error: "缺少租户上下文" };
      return;
    }
    const siteConfigService = strapi.plugin("zhao-common").service("site-config");
    const config2 = await siteConfigService.getConfig(siteId);
    ctx.body = { data: config2?.moduleVisibility ?? {} };
  },
  async update(ctx) {
    const siteId = ctx.state?.siteDocumentId;
    if (!siteId) {
      ctx.status = 400;
      ctx.body = { error: "缺少租户上下文" };
      return;
    }
    const body = ctx.request.body?.data || ctx.request.body;
    const { moduleVisibility: moduleVisibility2 } = body;
    if (typeof moduleVisibility2 !== "object" || Array.isArray(moduleVisibility2)) {
      ctx.status = 400;
      ctx.body = { error: "moduleVisibility must be an object" };
      return;
    }
    const filtered = {};
    for (const [key, roles] of Object.entries(moduleVisibility2)) {
      if (!VISIBILITY_MODULES.includes(key)) {
        strapi.log.warn(`[module-visibility] Unknown moduleKey ignored: ${key}`);
        continue;
      }
      if (!Array.isArray(roles)) {
        ctx.status = 400;
        ctx.body = { error: `moduleVisibility.${key} must be an array` };
        return;
      }
      filtered[key] = roles.filter(
        (r) => typeof r === "string" && VALID_ROLES.has(r)
      );
    }
    let globalVisibility = {};
    try {
      const globalConfig = await strapi.plugin("zhao-common").service("global-config").getGlobalConfig();
      globalVisibility = globalConfig?.moduleVisibility ?? {};
    } catch {
    }
    for (const [key, roles] of Object.entries(filtered)) {
      const globalRoles = globalVisibility[key] ?? DEFAULT_MODULE_VISIBILITY[key] ?? [];
      const invalidRoles = roles.filter((r) => !globalRoles.includes(r));
      if (invalidRoles.length > 0) {
        ctx.status = 400;
        ctx.body = {
          error: `moduleVisibility.${key} 包含全局未授权的角色: ${invalidRoles.join(", ")}`
        };
        return;
      }
    }
    try {
      const siteConfigService = strapi.plugin("zhao-common").service("site-config");
      await siteConfigService.updateConfig(siteId, { moduleVisibility: filtered });
      try {
        strapi.plugin("zhao-auth")?.service("permission")?.invalidateCache?.(void 0, siteId);
      } catch {
      }
      ctx.body = { data: filtered };
    } catch (e) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  }
};
const PERMISSION_UID = "plugin::zhao-auth.permission";
function normalizeRoleName(name) {
  return String(name || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
}
const permissionMatrixController = ({ strapi: strapi2 }) => ({
  async getMatrix(ctx) {
    try {
      const roles = await strapi2.db.query(PERMISSION_UID).findMany({ limit: 100 });
      const allActions = flattenPermissions(PERMISSION_TREE);
      ctx.send({
        data: roles.map((r) => ({
          role: r.role,
          displayName: r.displayName,
          permissions: r.permissions || [],
          isSystem: r.isSystem,
          seedVersion: r.seedVersion
        })),
        actions: allActions
      });
    } catch (error) {
      strapi2.log.error(`[zhao-auth] getMatrix failed: ${error.message}`);
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },
  async updateRolePermissions(ctx) {
    try {
      const { role } = ctx.params;
      const normalizedRole = normalizeRoleName(role);
      const { permissions: permissions2 } = ctx.request.body;
      if (!Array.isArray(permissions2)) {
        return ctx.throw(400, "permissions must be an array");
      }
      if (normalizedRole === ROLES.ADMIN) {
        return ctx.throw(403, "Cannot modify ADMIN role permissions");
      }
      const existing = await strapi2.db.query(PERMISSION_UID).findOne({ where: { role: normalizedRole } });
      if (!existing) {
        return ctx.throw(404, "Role not found");
      }
      await strapi2.db.query(PERMISSION_UID).update({
        where: { id: existing.id },
        data: { permissions: permissions2 }
      });
      strapi2.plugin("zhao-auth").service("permission").invalidatePermissionCache();
      ctx.send({ success: true });
    } catch (error) {
      strapi2.log.error(`[zhao-auth] updateRolePermissions failed: ${error.message}`);
      ctx.status = error.status || 500;
      ctx.body = { error: error.message };
    }
  },
  async resetRolePermissions(ctx) {
    try {
      const { role } = ctx.params;
      const normalizedRole = normalizeRoleName(role);
      if (normalizedRole === ROLES.ADMIN) {
        return ctx.throw(403, "Cannot reset ADMIN role");
      }
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[normalizedRole];
      if (!defaultPerms) {
        return ctx.throw(404, "No default permissions for this role");
      }
      const existing = await strapi2.db.query(PERMISSION_UID).findOne({ where: { role: normalizedRole } });
      if (!existing) {
        return ctx.throw(404, "Role not found");
      }
      await strapi2.db.query(PERMISSION_UID).update({
        where: { id: existing.id },
        data: { permissions: defaultPerms }
      });
      strapi2.plugin("zhao-auth").service("permission").invalidatePermissionCache();
      ctx.send({ success: true, permissions: defaultPerms });
    } catch (error) {
      strapi2.log.error(`[zhao-auth] resetRolePermissions failed: ${error.message}`);
      ctx.status = error.status || 500;
      ctx.body = { error: error.message };
    }
  },
  async getActions(ctx) {
    const allActions = flattenPermissions(PERMISSION_TREE);
    ctx.send({ data: allActions });
  }
});
const permissionCheckController = ({ strapi: strapi2 }) => ({
  async check(ctx) {
    const { userId, action } = ctx.request.body;
    if (!userId || !action) {
      return ctx.throw(400, "userId and action are required");
    }
    const result = await strapi2.plugin("zhao-auth").service("permission-check").checkPermission(userId, action);
    ctx.send({ data: result });
  }
});
const controllers = {
  "role-management": roleManagementController,
  auth: authController,
  permission: permissionController,
  "role-channel": roleChannelController,
  tenant: tenantController,
  "module-visibility": moduleVisibilityController,
  "permission-matrix": permissionMatrixController,
  "permission-check": permissionCheckController
};
const kind$2 = "collectionType";
const collectionName$2 = "zhao_permissions";
const info$2 = { "singularName": "permission", "pluralName": "permissions", "displayName": "角色权限" };
const options$2 = { "draftAndPublish": false };
const attributes$2 = { "role": { "type": "string", "required": true, "unique": true, "maxLength": 50 }, "displayName": { "type": "string", "required": true, "maxLength": 50 }, "description": { "type": "text" }, "permissions": { "type": "json", "required": true, "default": [] }, "isSystem": { "type": "boolean", "required": true, "default": false }, "level": { "type": "integer", "default": 20, "min": 1, "max": 100 }, "seedVersion": { "type": "string", "default": "" } };
const permissionSchema = {
  kind: kind$2,
  collectionName: collectionName$2,
  info: info$2,
  options: options$2,
  attributes: attributes$2
};
const kind$1 = "collectionType";
const collectionName$1 = "zhao_role_action_logs";
const info$1 = { "name": "role-action-log", "description": "角色操作日志", "singularName": "role-action-log", "pluralName": "role-action-logs", "displayName": "Role Action Log" };
const options$1 = { "draftAndPublish": false, "timestamps": false };
const attributes$1 = { "operatorId": { "type": "integer", "required": true, "description": "操作人ID" }, "targetUserId": { "type": "integer", "required": true, "description": "目标用户ID" }, "action": { "type": "string", "required": true, "enum": ["assign", "revoke"], "description": "操作类型" }, "role": { "type": "string", "required": true, "description": "角色名称" }, "reason": { "type": "text", "description": "操作原因" }, "timestamp": { "type": "datetime", "required": true, "description": "操作时间" } };
const roleActionLogSchema = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  attributes: attributes$1
};
const kind = "collectionType";
const collectionName = "zhao_role_channels";
const info = { "singularName": "role-channel", "pluralName": "role-channels", "displayName": "Role Channel", "description": "角色与渠道的绑定关系" };
const options = { "draftAndPublish": false };
const attributes = { "role": { "type": "string", "required": true }, "channel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-channel.channel" }, "assignedBy": { "type": "integer" } };
const roleChannelSchema = {
  kind,
  collectionName,
  info,
  options,
  attributes
};
const contentTypes = {
  permission: {
    schema: permissionSchema
  },
  "role-action-log": {
    schema: roleActionLogSchema
  },
  "role-channel": {
    schema: roleChannelSchema
  }
};
const isAuthenticated = async (policyContext, config2, { strapi: strapi2 }) => {
  const authService2 = strapi2.plugin("zhao-auth").service("auth");
  const token = authService2.extractToken(policyContext);
  if (!token) {
    return false;
  }
  try {
    const user = await authService2.authenticate(token);
    policyContext.state.user = user;
    policyContext.user = user;
    return true;
  } catch (e) {
    return false;
  }
};
const tenantContextInjector = async (policyContext, config2, { strapi: strapi2 }) => {
  if (!policyContext.state?.siteDocumentId) {
    const user = policyContext.state?.user;
    const currentTenantId = user?.currentTenantId;
    if (currentTenantId) {
      policyContext.state.siteDocumentId = currentTenantId;
    }
  }
  return true;
};
const hasPermission$1 = async (policyContext, config2, { strapi: strapi2 }) => {
  const user = policyContext.state?.user;
  if (!user?.id) {
    return false;
  }
  const action = config2?.action;
  if (!action) {
    return false;
  }
  const userRoles = Array.isArray(user.zhaoRoles) ? user.zhaoRoles : Array.isArray(user.roles) ? user.roles : [];
  if (userRoles.includes("admin")) {
    return true;
  }
  try {
    const permissionService2 = strapi2.plugin("zhao-auth").service("permission");
    const tenantDocumentId = policyContext.state?.siteDocumentId;
    const result = await permissionService2.getMyPermissions(user.id, tenantDocumentId);
    if (result.permissions.includes(action)) {
      return true;
    }
  } catch (e) {
  }
  return false;
};
const hasChannelAccess = async (policyContext, config2, { strapi: strapi2 }) => {
  const user = policyContext.state?.user;
  if (!user?.id) {
    return false;
  }
  const rawId = config2?.channelId ?? policyContext.params?.channelId ?? policyContext.params?.id ?? policyContext.request?.body?.channelId ?? policyContext.query?.channel;
  const channelId = typeof rawId === "string" ? parseInt(rawId, 10) : Number(rawId);
  if (isNaN(channelId) || channelId <= 0) {
    return false;
  }
  try {
    const channelPermService = strapi2.plugin("zhao-channel").service("channel-permission");
    const hasPermission2 = await channelPermService.checkUserChannelPermission(user.id, channelId);
    if (!hasPermission2) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};
const hasChannelScope = async (policyContext, config2, { strapi: strapi2 }) => {
  let user = policyContext.state?.user;
  if (!user?.id && policyContext.request?.headers?.authorization) {
    try {
      const authHeader = policyContext.request.headers.authorization;
      const token = authHeader.replace("Bearer ", "");
      const jwt2 = require("jsonwebtoken");
      const decoded = jwt2.decode(token);
      if (decoded?.id) {
        user = await strapi2.entityService.findOne("plugin::users-permissions.user", decoded.id, {
          fields: ["id", "username", "email", "zhaoRoles"]
        });
      }
    } catch (err) {
      strapi2.log.error(`[has-channel-scope] 解析 token 失败: ${err.message}`);
    }
    if (!user?.id) {
      policyContext.state.channelScope = { all: false, channelIds: [], isGuest: true };
      return true;
    }
    try {
      const channelScopeService2 = strapi2.plugin("zhao-auth").service("channel-scope");
      const scope = await channelScopeService2.resolve(user);
      policyContext.state.channelScope = scope;
    } catch (err) {
      strapi2.log.error(`[has-channel-scope] 错误: ${err.message}`);
      policyContext.state.channelScope = { all: false, channelIds: [], isGuest: false };
    }
    return true;
  }
  return true;
};
const hasTenantAccess = async (policyContext, config2, { strapi: strapi2 }) => {
  const user = policyContext.state?.user;
  if (!user?.id) {
    return false;
  }
  const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : Array.isArray(user.zhaoRoles) ? user.zhaoRoles : [];
  if (userRoles.includes("admin")) {
    return true;
  }
  const siteId = policyContext.state?.siteDocumentId;
  if (!siteId) {
    return true;
  }
  const scope = policyContext.state?.channelScope;
  let userChannelIds;
  if (scope) {
    if (scope.all) {
      return true;
    }
    userChannelIds = Array.isArray(scope.channelIds) ? scope.channelIds : [];
  } else {
    try {
      const channelPermService = strapi2.plugin("zhao-channel").service("channel-permission");
      userChannelIds = await channelPermService.getUserAllChannels(user.id) || [];
    } catch (e) {
      strapi2.log.warn(`[has-tenant-access] failed to resolve user channels: ${e.message}`);
      return false;
    }
  }
  if (userChannelIds.length === 0) {
    return false;
  }
  let siteChannelIds = [];
  try {
    const siteConfig = await strapi2.db.query("plugin::zhao-common.site-config").findOne({
      where: { documentId: siteId },
      populate: { channels: { select: ["id"] } }
    });
    if (siteConfig?.channels && Array.isArray(siteConfig.channels)) {
      siteChannelIds = siteConfig.channels.map((c) => c?.id).filter((id) => typeof id === "number");
    }
  } catch (e) {
    strapi2.log.warn(`[has-tenant-access] failed to query site channels: ${e.message}`);
    return false;
  }
  if (siteChannelIds.length === 0) {
    return false;
  }
  return userChannelIds.some((uc) => siteChannelIds.includes(uc));
};
const policies = {
  "is-authenticated": isAuthenticated,
  "tenant-context-injector": tenantContextInjector,
  "has-permission": hasPermission$1,
  "has-channel-access": hasChannelAccess,
  "has-channel-scope": hasChannelScope,
  "has-tenant-access": hasTenantAccess
};
async function ensureAdminUser(strapi2) {
  try {
    const knex = strapi2.db.connection;
    const existing = await knex("up_users").whereRaw("zhao_roles @> ?::jsonb", [JSON.stringify(["admin"])]).select("id", "username", "email").first();
    if (existing) {
      strapi2.log.info(
        `zhao-auth: 已存在 admin 用户（id=${existing.id}, username=${existing.username}），跳过初始化`
      );
      return;
    }
    const username = process.env.INIT_ADMIN_USERNAME || "admin";
    const email = process.env.INIT_ADMIN_EMAIL || "admin@example.com";
    const password = process.env.INIT_ADMIN_PASSWORD || "Admin@12345";
    const dup = await knex("up_users").where("username", username).orWhere("email", email).select("id", "username", "email").first();
    if (dup) {
      strapi2.log.warn(
        `zhao-auth: 用户名或邮箱已被占用（id=${dup.id}, username=${dup.username}），但该用户非 admin 角色。跳过 admin 初始化，请手动处理。`
      );
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const documentId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : require("crypto").randomUUID();
    const now = /* @__PURE__ */ new Date();
    await knex("up_users").insert({
      document_id: documentId,
      username,
      email,
      password: hash,
      provider: "local",
      confirmed: true,
      blocked: false,
      zhao_roles: JSON.stringify(["admin"]),
      created_at: now,
      updated_at: now,
      published_at: now
    });
    strapi2.log.info(
      `zhao-auth: ✅ 已创建第一个 admin 用户（username=${username}, email=${email}）。请尽快修改默认密码。`
    );
  } catch (error) {
    strapi2.log.warn(
      `zhao-auth: admin 用户初始化失败: ${error?.message || String(error)}`
    );
  }
}
const bootstrap = async ({ strapi: strapi2 }) => {
  strapi2.log.info("zhao-auth: 插件已启动");
  setTimeout(async () => {
    try {
      const results = await strapi2.plugin("zhao-auth").service("permission").initDefaultRoles();
      if (results && results.length) {
        strapi2.log.info(
          `zhao-auth: 角色初始化完成 [${results.join(", ")}]`
        );
      }
      await ensureAdminUser(strapi2);
    } catch (error) {
      strapi2.log.warn(
        `zhao-auth: 角色初始化失败（可能是 content-type 尚未就绪，可通过 POST /api/zhao-auth/v1/admin/permissions/init 手动触发）: ${error?.message || String(error)}`
      );
    }
  }, 3e3);
};
const register = ({ strapi: strapi2 }) => {
  const policyRegistry = strapi2.get("policies");
  policyRegistry.add("plugin::zhao-auth", policies);
  strapi2.log.info("[zhao-auth] 策略已注册");
};
const destroy = ({ strapi: strapi2 }) => {
  strapi2.log.info("zhao-auth plugin destroyed");
};
const config = {
  default: {
    // 认证中间件默认配置
    authenticate: {
      publicPaths: []
    },
    // 授权中间件默认配置
    authorize: {
      policies: []
    }
  },
  validator: (config2) => {
    if (config2.authenticate && typeof config2.authenticate !== "object") {
      throw new Error("authenticate 配置必须是对象");
    }
    if (config2.authorize && typeof config2.authorize !== "object") {
      throw new Error("authorize 配置必须是对象");
    }
  }
};
const publicRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false }
});
const userRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      "plugin::zhao-auth.tenant-context-injector"
    ]
  }
});
const adminRoute$1 = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      "plugin::zhao-auth.tenant-context-injector",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } }
    ]
  }
});
const contentApi = () => ({
  type: "content-api",
  routes: [
    publicRoute("GET", "/auth/config", "auth.config"),
    publicRoute("POST", "/login", "auth.login"),
    publicRoute("POST", "/admin/auth/local", "auth.adminLocal"),
    publicRoute("POST", "/register", "auth.register"),
    publicRoute("POST", "/reset-password", "auth.resetPassword"),
    userRoute("POST", "/auth/switch-tenant", "auth.switchTenant"),
    userRoute("GET", "/my/roles", "role-management.getMyRoles"),
    userRoute("GET", "/my/permissions", "role-management.getMyPermissions"),
    userRoute("GET", "/my/permission-keys", "permission.getMyPermissions"),
    // 角色管理
    adminRoute$1("GET", "/roles", "permission.listRoles", "role.read"),
    adminRoute$1("GET", "/roles/all", "permission.getAllRoles", "role.read"),
    adminRoute$1("GET", "/roles/:role", "permission.getRole", "role.read"),
    adminRoute$1("POST", "/roles", "permission.createRole", "role.create"),
    adminRoute$1("PUT", "/roles/:role", "permission.updateRole", "role.assign"),
    adminRoute$1("DELETE", "/roles/:role", "permission.deleteRole", "role.assign"),
    adminRoute$1("GET", "/users", "role-management.findUsers", "role.read"),
    adminRoute$1("GET", "/users/:id/roles", "role-management.getUserRoles", "role.read"),
    adminRoute$1("POST", "/roles/assign", "role-management.assignRole", "role.assign"),
    adminRoute$1("POST", "/roles/revoke", "role-management.revokeRole", "role.revoke"),
    adminRoute$1("POST", "/roles/batch-assign", "role-management.batchAssignRoles", "role.assign"),
    adminRoute$1("GET", "/roles/logs", "role-management.getActionLogs", "role.read-logs"),
    adminRoute$1("GET", "/users/:id/detail", "role-management.getUserDetail", "role.read"),
    adminRoute$1("GET", "/assignable-roles", "role-management.getAssignableRoles", "role.read"),
    // 权限管理
    adminRoute$1("GET", "/permissions/tree", "permission.getTree", "role.read"),
    adminRoute$1("GET", "/permissions/role/:role", "permission.getRolePermissions", "role.read"),
    adminRoute$1("PUT", "/permissions/role/:role", "permission.updateRolePermissions", "role.assign"),
    adminRoute$1("POST", "/permissions/init", "permission.initRoles", "role.assign"),
    // 渠道范围查询
    userRoute("GET", "/my/channel-scope", "permission.getMyChannelScope"),
    // 角色-渠道授权
    adminRoute$1("GET", "/role-channels", "role-channel.list", "role.assign"),
    adminRoute$1("POST", "/role-channels", "role-channel.grant", "role.assign"),
    adminRoute$1("POST", "/role-channels/batch", "role-channel.batchGrant", "role.assign"),
    adminRoute$1("DELETE", "/role-channels/:id", "role-channel.revoke", "role.assign"),
    adminRoute$1("DELETE", "/role-channels/role/:role", "role-channel.revokeByRole", "role.assign"),
    // === 新增 admin 路由（避免与现有路由重复）===
    // me - 仅 1 件套（任何已认证用户都能查自己的权限，无需权限校验）
    {
      method: "GET",
      path: "/v1/admin/me",
      handler: "role-management.me",
      config: {
        auth: false,
        policies: ["plugin::zhao-auth.is-authenticated"]
      }
    },
    // permission matrix（新功能）
    adminRoute$1("GET", "/permissions/matrix", "permission-matrix.getMatrix", "zhao-auth.permission.matrix.edit"),
    adminRoute$1("PUT", "/permissions/roles/:role", "permission-matrix.updateRolePermissions", "zhao-auth.permission.matrix.edit"),
    adminRoute$1("POST", "/permissions/roles/:role/reset", "permission-matrix.resetRolePermissions", "zhao-auth.permission.matrix.edit"),
    adminRoute$1("GET", "/permissions/actions", "permission-matrix.getActions", "zhao-auth.permission.matrix.edit"),
    // logs（更通用的 GET /logs，与现有 GET /roles/logs 并存）
    adminRoute$1("GET", "/logs", "role-management.getActionLogs", "zhao-auth.audit-log.view"),
    // check（新功能 - 权限检查工具）
    adminRoute$1("POST", "/check", "permission-check.check", "zhao-auth.permission.check")
  ]
});
const tenant = () => ({
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/v1/my/tenants",
      handler: "tenant.getMyTenants",
      config: {
        auth: false,
        policies: [
          "plugin::zhao-auth.is-authenticated",
          "plugin::zhao-auth.tenant-context-injector"
        ]
      }
    }
  ]
});
const adminRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      "plugin::zhao-auth.tenant-context-injector",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } }
    ]
  }
});
const moduleVisibility = () => ({
  type: "content-api",
  routes: [
    adminRoute("GET", "/module-visibility", "module-visibility.get", "menu.module-visibility"),
    adminRoute("PUT", "/module-visibility", "module-visibility.update", "menu.module-visibility")
  ]
});
const routes = {
  "content-api": {
    type: "content-api",
    routes: contentApi().routes
  },
  tenant: {
    type: "content-api",
    routes: tenant().routes
  },
  "module-visibility": {
    type: "content-api",
    routes: moduleVisibility().routes
  }
};
function hasPermission(userRoles, requiredPermission, permissionConfig) {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }
  const effectiveRoles = getEffectiveRoles(userRoles);
  for (const role of effectiveRoles) {
    const permissions2 = permissionConfig[role];
    if (permissions2 && permissions2.includes(requiredPermission)) {
      return true;
    }
    if (permissions2 && permissions2.includes("*")) {
      return true;
    }
  }
  return false;
}
function hasAnyRole(userRoles, requiredRoles) {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }
  const effectiveRoles = getEffectiveRoles(userRoles);
  return requiredRoles.some((requiredRole) => effectiveRoles.includes(requiredRole));
}
function getEffectiveRoles(userRoles) {
  if (!userRoles || userRoles.length === 0) {
    return [];
  }
  const effectiveSet = new Set(userRoles);
  for (const role of userRoles) {
    const inheritedRoles = ROLE_INHERITANCE[role];
    if (inheritedRoles) {
      for (const inheritedRole of inheritedRoles) {
        effectiveSet.add(inheritedRole);
      }
    }
  }
  return Array.from(effectiveSet);
}
function validatePermissionFormat(permission) {
  if (!permission || typeof permission !== "string") {
    return false;
  }
  const validFormats = [
    /^[a-z]+:[a-z_]+$/,
    /^[a-z]+\.[a-z_]+$/
  ];
  return validFormats.some((format) => format.test(permission));
}
function parsePermission(permission) {
  if (!validatePermissionFormat(permission)) {
    return null;
  }
  if (permission.includes(":")) {
    const [plugin, action] = permission.split(":");
    return { plugin, action };
  }
  if (permission.includes(".")) {
    const [resource, action] = permission.split(".");
    return { resource, action };
  }
  return null;
}
const index = {
  register,
  bootstrap,
  destroy,
  config,
  services,
  controllers,
  contentTypes,
  policies,
  middlewares,
  routes
};
export {
  index as default,
  getEffectiveRoles,
  hasAnyRole,
  hasPermission,
  parsePermission,
  validatePermissionFormat
};
