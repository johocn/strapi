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
  USER: "user"
};
const ROLE_LABELS = {
  [ROLES.ADMIN]: "系统管理员",
  [ROLES.CHANNEL_ADMIN]: "渠道管理员",
  [ROLES.PLUGIN_MANAGER]: "插件管理员",
  [ROLES.INSTRUCTOR]: "讲师",
  [ROLES.USER]: "普通用户"
};
const PERMISSION_TREE = {
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
          "exam.delete": { label: "删除考试", type: "button" }
        }
      },
      "menu.quiz-record": {
        label: "答题记录",
        type: "menu",
        children: {
          "quiz-record.read": { label: "查看答题记录", type: "button" }
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
          "channel-permission.set": { label: "授权渠道", type: "button" }
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
      "menu.media": { label: "媒体资源", type: "menu" },
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
          "sso.log-read": { label: "查看日志", type: "button" }
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
      "menu.tag-search": { label: "全局检索", type: "menu" }
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
const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: flattenPermissions(PERMISSION_TREE),
  [ROLES.CHANNEL_ADMIN]: [
    ...flattenPermissions(PERMISSION_TREE).filter(
      (k) => !k.startsWith("menu.system-center")
    ),
    "menu.tenant",
    "tenant.read",
    "tenant.create",
    "tenant.update",
    "tenant.delete",
    "menu.site-config",
    "site-config.update",
    "config.read",
    "config.update",
    "menu.feature-flag",
    "feature-flag.update",
    "config.feature.update",
    "channel.config.update",
    "menu.user-roles",
    "role.read",
    "role.assign",
    "role.revoke",
    "role.create",
    "role.read-logs"
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
    "channel.config.update"
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
    "knowledge-point.update"
  ],
  [ROLES.USER]: []
};
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
const CACHE_TTL = 3e5;
const permissionCache = /* @__PURE__ */ new Map();
function invalidateUserCache(userId) {
  permissionCache.delete(userId);
}
function extractRoleNames(user) {
  if (Array.isArray(user.zhaoRoles) && user.zhaoRoles.length > 0) {
    return user.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((name) => name && name.trim());
  }
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles.map((r) => typeof r === "string" ? r : r?.name || r?.type).filter((name) => name && name.trim());
  }
  if (user.role) {
    if (Array.isArray(user.role)) {
      return user.role.map((r) => r?.name || r?.type).filter((name2) => name2 && name2.trim());
    }
    const name = user.role.name || user.role.type;
    return name ? [name] : [];
  }
  return [];
}
const PERMISSION_UID$1 = "plugin::zhao-auth.permission";
async function getRoleLevel(role) {
  if (ROLE_HIERARCHY[role] != null) return ROLE_HIERARCHY[role];
  const roleRecord = await strapi.db.query(PERMISSION_UID$1).findOne({
    where: { role },
    select: ["level"]
  });
  return roleRecord?.level ?? 20;
}
async function getUserLevel(userId) {
  const user = await strapi.db.query(USER_UID$1).findOne({
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
const roleManagementService = ({ strapi: strapi2 }) => {
  async function getUserEffectivePermissions(userId) {
    const cached = permissionCache.get(userId);
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
    const permissions = {
      direct: directRoles,
      inherited: inheritedRoles,
      effective
    };
    permissionCache.set(userId, { data: permissions, timestamp: Date.now() });
    return permissions;
  }
  return {
    /**
     * 查询用户列表
     * @param filters 筛选条件
     * @param page 页码
     * @param pageSize 每页数量
     */
    async findUsers(filters = {}, page = 1, pageSize = 20) {
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
      const users = await strapi2.db.query(USER_UID$1).findMany({
        where,
        select: ["id", "email", "username", "createdAt", "zhaoRoles"],
        populate: ["role"],
        orderBy: { id: "asc" },
        offset: (page - 1) * pageSize,
        limit: pageSize
      });
      const total = await strapi2.db.query(USER_UID$1).count({ where });
      const list = users.map((user) => ({
        id: user.id,
        documentId: user.id,
        username: user.username,
        email: user.email,
        roles: extractRoleNames(user),
        createdAt: user.createdAt
      }));
      return {
        data: list,
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
     * @param userId 用户ID
     * @param role 角色名称
     * @param operatorId 操作人ID
     * @param reason 操作原因
     */
    async assignRole(userId, role, operatorId, reason) {
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
      const operatorLevel = await getUserLevel(operatorId);
      if (operatorLevel < 100) {
        const targetLevel = await getRoleLevel(normalizedRole);
        if (targetLevel > operatorLevel) {
          throwErr("ROLE_004", 403, "不能分配同级或更高层级角色");
        }
      }
      if (operatorLevel < 100) {
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
      const newRoles = [...currentRoles, normalizedRole];
      await strapi2.db.query(USER_UID$1).update({
        where: { id: userId },
        data: { zhaoRoles: newRoles }
      });
      if (operatorLevel < 100) {
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
      await this.logAction(operatorId, userId, "assign", role, reason);
      return {
        success: true,
        message: `角色 ${role} 分配成功`,
        user: {
          id: userId,
          roles: newRoles
        }
      };
    },
    async revokeRole(userId, role, operatorId, reason) {
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
      const newRoles = currentRoles.filter((r) => r !== role);
      await strapi2.db.query(USER_UID$1).update({
        where: { id: userId },
        data: { zhaoRoles: newRoles }
      });
      invalidateUserCache(userId);
      await this.logAction(operatorId, userId, "revoke", role, reason);
      return {
        success: true,
        message: `角色 ${role} 撤销成功`,
        user: {
          id: userId,
          roles: newRoles
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
     * 批量分配角色
     * @param userIds 用户ID列表
     * @param role 角色名称
     * @param operatorId 操作人ID
     * @param reason 操作原因
     */
    async batchAssignRoles(userIds, role, operatorId, reason) {
      const results = [];
      for (const userId of userIds) {
        try {
          await this.assignRole(userId, role, operatorId, reason);
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
     * 检查用户是否具有特定权限（包含继承权限）
     * @param userId 用户ID
     * @param requiredRole 所需角色
     * @returns 是否具有权限
     */
    async checkPermission(userId, requiredRole) {
      const effectiveRoles = await getUserEffectivePermissions(userId);
      return effectiveRoles.effective.includes(requiredRole);
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
      const permissions = {};
      for (const role of roles) {
        const rolePerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
        for (const action of rolePerms) {
          permissions[action] = true;
        }
      }
      return { roles, permissions };
    }
  };
};
const PERMISSION_UID = "plugin::zhao-auth.permission";
const USER_UID = "plugin::users-permissions.user";
function normalizeRoleName(name) {
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
    if (found?.children) {
      flattenPermissions(found.children).forEach((k) => result.add(k));
    }
  }
  return Array.from(result);
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
    const records = await strapi2.db.query(PERMISSION_UID).findMany({
      where,
      orderBy: { id: "asc" },
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    const total = await strapi2.db.query(PERMISSION_UID).count({ where });
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
    const records = await strapi2.db.query(PERMISSION_UID).findMany({
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
    const record = await strapi2.db.query(PERMISSION_UID).findOne({
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
    const role = normalizeRoleName(data.role);
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
    const existing = await strapi2.db.query(PERMISSION_UID).findOne({
      where: { role }
    });
    if (existing) {
      const e = new Error(`角色 ${role} 已存在`);
      e.status = 409;
      throw e;
    }
    const created = await strapi2.documents(PERMISSION_UID).create({
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
    const existing = await strapi2.db.query(PERMISSION_UID).findOne({
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
    const updated = await strapi2.documents(PERMISSION_UID).update({
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
    const existing = await strapi2.db.query(PERMISSION_UID).findOne({
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
    await strapi2.documents(PERMISSION_UID).delete({ documentId: existing.documentId });
    return { success: true, role: roleName };
  },
  /**
   * 获取某角色权限
   */
  async getRolePermissions(role) {
    const record = await strapi2.db.query(PERMISSION_UID).findOne({
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
    const existing = await strapi2.db.query(PERMISSION_UID).findOne({
      where: { role }
    });
    if (existing) {
      const updated = await strapi2.documents(PERMISSION_UID).update({
        documentId: existing.documentId,
        data: { permissions: permissionKeys }
      });
      return { role, permissions: updated.permissions };
    }
    const created = await strapi2.documents(PERMISSION_UID).create({
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
  async getMyPermissions(userId) {
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
      return { permissions: flattenPermissions(PERMISSION_TREE) };
    }
    const allExpanded = /* @__PURE__ */ new Set();
    for (const roleName of userRoles) {
      try {
        const record = await strapi2.db.query(PERMISSION_UID).findOne({
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
    return { permissions: Array.from(allExpanded) };
  },
  /**
   * 初始化并同步默认角色权限（每次启动时调用）
   * 系统角色的权限会与代码配置保持同步
   */
  async initDefaultRoles() {
    const results = [];
    for (const [role, defaultPerms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const existing = await strapi2.db.query(PERMISSION_UID).findOne({
        where: { role }
      });
      if (!existing) {
        await strapi2.documents(PERMISSION_UID).create({
          data: {
            role,
            displayName: ROLE_LABELS[role] || role,
            description: "",
            permissions: defaultPerms,
            isSystem: Object.values(ROLES).includes(role)
          }
        });
        results.push(`Created role: ${role}`);
      } else {
        const isSystemRole = Object.values(ROLES).includes(role);
        if (isSystemRole) {
          await strapi2.documents(PERMISSION_UID).update({
            documentId: existing.documentId,
            data: {
              displayName: ROLE_LABELS[role] || role,
              description: existing.description || "",
              permissions: defaultPerms,
              isSystem: true
            }
          });
          results.push(`Synced permissions for system role: ${role}`);
        } else {
          if (!existing.displayName) {
            await strapi2.documents(PERMISSION_UID).update({
              documentId: existing.documentId,
              data: {
                displayName: ROLE_LABELS[role] || role,
                description: "",
                isSystem: false
              }
            });
            results.push(`Updated role fields for: ${role}`);
          } else {
            results.push(`Role ${role} already exists, skipped (non-system)`);
          }
        }
      }
    }
    return results;
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
    if (ids.length === 0) {
      return { [field]: { id: { $in: [-1] } } };
    }
    return { [field]: { id: { $in: ids } } };
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
const services = {
  auth: authService,
  jwt: jwtService,
  "role-management": roleManagementService,
  permission: permissionService,
  "channel-scope": channelScopeService,
  "role-channel": roleChannelService,
  tenant: tenantService
};
const middlewares = {};
const roleManagementController = ({ strapi: strapi2 }) => ({
  async findUsers(ctx) {
    try {
      const { page = 1, pageSize = 20, ...filters } = ctx.query;
      const result = await strapi2.plugin("zhao-auth").service("role-management").findUsers(
        filters,
        parseInt(page, 10),
        parseInt(pageSize, 10)
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
      const result = await strapi2.plugin("zhao-auth").service("role-management").assignRole(userId, role, operatorId, reason);
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
      const result = await strapi2.plugin("zhao-auth").service("role-management").revokeRole(userId, role, operatorId, reason);
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
      const result = await strapi2.plugin("zhao-auth").service("role-management").batchAssignRoles(userIds, role, operatorId, reason);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Batch assign roles failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async getActionLogs(ctx) {
    try {
      const { userId, operatorId, page = 1, pageSize = 20 } = ctx.query;
      const result = await strapi2.plugin("zhao-auth").service("role-management").getActionLogs(
        userId ? parseInt(userId, 10) : void 0,
        operatorId ? parseInt(operatorId, 10) : void 0,
        parseInt(page, 10),
        parseInt(pageSize, 10)
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
      const adminRoles = ["admin", "super-admin", "manager"];
      const hasAdminRole = roles.some((r) => adminRoles.includes(r));
      if (!hasAdminRole) {
        ctx.status = 403;
        ctx.body = { error: "无管理后台访问权限" };
        return;
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
      return flag && flag.flagValue === true && flag.enabled !== false;
    } catch {
      return false;
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
      const { role, displayName, description, permissions, level } = ctx.request.body;
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
          permissions: Array.isArray(permissions) ? permissions : [],
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
      const { displayName, description, permissions } = ctx.request.body;
      const result = await strapi2.plugin("zhao-auth").service("permission").updateRole(role, { displayName, description, permissions });
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
      const { permissions } = body;
      if (!role) {
        ctx.status = 400;
        ctx.body = { error: "缺少角色参数" };
        return;
      }
      if (!Array.isArray(permissions)) {
        ctx.status = 400;
        ctx.body = { error: "permissions 必须是数组" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("permission").updateRolePermissions(role, permissions);
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
      const result = await strapi2.plugin("zhao-auth").service("permission").getMyPermissions(userId);
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
const controllers = {
  "role-management": roleManagementController,
  auth: authController,
  permission: permissionController,
  "role-channel": roleChannelController,
  tenant: tenantController
};
const kind$2 = "collectionType";
const collectionName$2 = "zhao_permissions";
const info$2 = { "singularName": "permission", "pluralName": "permissions", "displayName": "角色权限" };
const options$2 = { "draftAndPublish": false };
const attributes$2 = { "role": { "type": "string", "required": true, "unique": true, "maxLength": 50 }, "displayName": { "type": "string", "required": true, "maxLength": 50 }, "description": { "type": "text" }, "permissions": { "type": "json", "required": true, "default": [] }, "isSystem": { "type": "boolean", "required": true, "default": false }, "level": { "type": "integer", "default": 20, "min": 1, "max": 100 } };
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
const hasPermission$1 = async (policyContext, config2, { strapi: strapi2 }) => {
  const user = policyContext.state?.user;
  if (!user?.id) {
    return false;
  }
  const action = config2?.action;
  if (!action) {
    return false;
  }
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  if (userRoles.includes("admin")) {
    return true;
  }
  try {
    const permissionService2 = strapi2.plugin("zhao-auth").service("permission");
    const result = await permissionService2.getMyPermissions(user.id);
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
  const siteId = policyContext.state?.siteId;
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
  "has-permission": hasPermission$1,
  "has-channel-access": hasChannelAccess,
  "has-channel-scope": hasChannelScope,
  "has-tenant-access": hasTenantAccess
};
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
    policies: ["plugin::zhao-auth.is-authenticated"]
  }
});
const adminRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
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
    userRoute("GET", "/my/roles", "role-management.getMyRoles"),
    userRoute("GET", "/my/permissions", "role-management.getMyPermissions"),
    userRoute("GET", "/my/permission-keys", "permission.getMyPermissions"),
    // 角色管理
    adminRoute("GET", "/roles", "permission.listRoles", "role.read"),
    adminRoute("GET", "/roles/all", "permission.getAllRoles", "role.read"),
    adminRoute("GET", "/roles/:role", "permission.getRole", "role.read"),
    adminRoute("POST", "/roles", "permission.createRole", "role.create"),
    adminRoute("PUT", "/roles/:role", "permission.updateRole", "role.assign"),
    adminRoute("DELETE", "/roles/:role", "permission.deleteRole", "role.assign"),
    adminRoute("GET", "/users", "role-management.findUsers", "role.read"),
    adminRoute("GET", "/users/:id/roles", "role-management.getUserRoles", "role.read"),
    adminRoute("POST", "/roles/assign", "role-management.assignRole", "role.assign"),
    adminRoute("POST", "/roles/revoke", "role-management.revokeRole", "role.revoke"),
    adminRoute("POST", "/roles/batch-assign", "role-management.batchAssignRoles", "role.assign"),
    adminRoute("GET", "/roles/logs", "role-management.getActionLogs", "role.read-logs"),
    // 权限管理
    adminRoute("GET", "/permissions/tree", "permission.getTree", "role.read"),
    adminRoute("GET", "/permissions/role/:role", "permission.getRolePermissions", "role.read"),
    adminRoute("PUT", "/permissions/role/:role", "permission.updateRolePermissions", "role.assign"),
    adminRoute("POST", "/permissions/init", "permission.initRoles", "role.assign"),
    // 渠道范围查询
    userRoute("GET", "/my/channel-scope", "permission.getMyChannelScope"),
    // 角色-渠道授权
    adminRoute("GET", "/role-channels", "role-channel.list", "role.assign"),
    adminRoute("POST", "/role-channels", "role-channel.grant", "role.assign"),
    adminRoute("POST", "/role-channels/batch", "role-channel.batchGrant", "role.assign"),
    adminRoute("DELETE", "/role-channels/:id", "role-channel.revoke", "role.assign"),
    adminRoute("DELETE", "/role-channels/role/:role", "role-channel.revokeByRole", "role.assign")
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
        policies: ["plugin::zhao-auth.is-authenticated"]
      }
    }
  ]
});
const contentApiRoutes = contentApi();
const tenantRoutes = tenant();
const routes = {
  "content-api": {
    type: "content-api",
    routes: contentApiRoutes.routes
  },
  tenant: {
    type: "content-api",
    routes: tenantRoutes.routes
  }
};
function hasPermission(userRoles, requiredPermission, permissionConfig) {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }
  const effectiveRoles = getEffectiveRoles(userRoles);
  for (const role of effectiveRoles) {
    const permissions = permissionConfig[role];
    if (permissions && permissions.includes(requiredPermission)) {
      return true;
    }
    if (permissions && permissions.includes("*")) {
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
