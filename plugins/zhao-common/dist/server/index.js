"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const fs = require("fs");
const path = require("path");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const fs__default = /* @__PURE__ */ _interopDefault(fs);
const path__default = /* @__PURE__ */ _interopDefault(path);
const hasTenantAccessLoose = async (policyContext, config2, { strapi: strapi2 }) => {
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
      userChannelIds = await strapi2.plugin("zhao-channel").service("channel-permission").getUserAllChannels(user.id) || [];
    } catch (e) {
      strapi2.log.warn(`[has-tenant-access-loose] failed to resolve user channels: ${e.message}`);
      return false;
    }
  }
  let siteChannelIds = [];
  try {
    const siteConfig2 = await strapi2.db.query("plugin::zhao-common.site-config").findOne({
      where: { documentId: siteId },
      populate: { channels: { select: ["id"] } }
    });
    if (siteConfig2?.channels && Array.isArray(siteConfig2.channels)) {
      siteChannelIds = siteConfig2.channels.map((c) => c?.id).filter((id) => typeof id === "number");
    }
  } catch (e) {
    strapi2.log.warn(`[has-tenant-access-loose] failed to query site channels: ${e.message}`);
    return false;
  }
  if (userChannelIds.length === 0 && siteChannelIds.length === 0) {
    return false;
  }
  return true;
};
const hasTenantAccessStrict = async (policyContext, config2, { strapi: strapi2 }) => {
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
  let userChannelIds;
  try {
    userChannelIds = await strapi2.plugin("zhao-channel").service("channel-permission").getUserDirectChannels(user.id) || [];
  } catch (e) {
    strapi2.log.warn(`[has-tenant-access-strict] failed to resolve user direct channels: ${e.message}`);
    return false;
  }
  let siteChannelIds = [];
  try {
    const siteConfig2 = await strapi2.db.query("plugin::zhao-common.site-config").findOne({
      where: { documentId: siteId },
      populate: { channels: { select: ["id"] } }
    });
    if (siteConfig2?.channels && Array.isArray(siteConfig2.channels)) {
      siteChannelIds = siteConfig2.channels.map((c) => c?.id).filter((id) => typeof id === "number");
    }
  } catch (e) {
    strapi2.log.warn(`[has-tenant-access-strict] failed to query site channels: ${e.message}`);
    return false;
  }
  if (userChannelIds.length === 0 && siteChannelIds.length === 0) {
    return false;
  }
  return true;
};
const resolveChannelScope = async (policyContext, config2, { strapi: strapi2 }) => {
  const channelScope = policyContext.state?.channelScope;
  const isGuest = !channelScope || channelScope.isGuest === true || !channelScope.all && !channelScope.channelIds?.length;
  const userChannelIds = channelScope?.all ? [] : Array.isArray(channelScope?.channelIds) ? channelScope.channelIds : [];
  const siteId = policyContext.state?.siteDocumentId;
  if (!siteId) {
    policyContext.state.channelUsage = "site_cross_user";
    policyContext.state.mergedChannelIds = userChannelIds;
    policyContext.state.crossChannelEnabled = true;
    policyContext.state.siteChannelIds = [];
    policyContext.state.isGuest = isGuest;
    return true;
  }
  let siteChannelIds = [];
  let channelUsage = "site_cross_user";
  try {
    const siteConfig2 = await strapi2.db.query("plugin::zhao-common.site-config").findOne({
      where: { documentId: siteId },
      select: ["channelUsage"],
      populate: { channels: { select: ["id"] } }
    });
    if (siteConfig2) {
      if (siteConfig2.channelUsage) {
        channelUsage = siteConfig2.channelUsage;
      }
      if (Array.isArray(siteConfig2.channels)) {
        siteChannelIds = siteConfig2.channels.map((c) => typeof c === "number" ? c : c?.id).filter((id) => typeof id === "number");
      }
    }
  } catch (e) {
    strapi2.log.warn(`[resolve-channel-scope] 查询 site-config 失败: ${e.message}`);
  }
  let mergedChannelIds;
  if (channelUsage === "site_cross_user" && !channelScope?.all) {
    const set = /* @__PURE__ */ new Set([...siteChannelIds, ...userChannelIds]);
    mergedChannelIds = Array.from(set);
  } else {
    mergedChannelIds = siteChannelIds;
  }
  const crossChannelEnabled = channelUsage !== "site_only";
  policyContext.state.channelUsage = channelUsage;
  policyContext.state.mergedChannelIds = mergedChannelIds;
  policyContext.state.crossChannelEnabled = crossChannelEnabled;
  policyContext.state.siteChannelIds = siteChannelIds;
  policyContext.state.isGuest = isGuest;
  return true;
};
const policies = {
  "has-tenant-access-loose": hasTenantAccessLoose,
  "has-tenant-access-strict": hasTenantAccessStrict,
  "resolve-channel-scope": resolveChannelScope
};
const register = ({ strapi: strapi2 }) => {
  const policyRegistry = strapi2.get("policies");
  policyRegistry.add("plugin::zhao-common", policies);
  strapi2.log.info("[zhao-common] 策略已注册");
};
const SITE_CONFIG_UID$3 = "plugin::zhao-common.site-config";
function extractHost(input) {
  let v = (input || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) {
    try {
      return new URL(v).hostname || "";
    } catch {
      return "";
    }
  }
  return v.replace(/:\d+$/, "");
}
const siteResolver = (config2, { strapi: strapi2 }) => {
  return async (ctx, next) => {
    if (ctx.state?.siteId) {
      return await next();
    }
    const raw = typeof ctx.query?.domain === "string" && ctx.query.domain || typeof ctx.request?.header?.["x-site-domain"] === "string" && ctx.request.header["x-site-domain"] || ctx.request.header.host || "";
    const domain = extractHost(raw);
    try {
      if (domain) {
        const records = await strapi2.documents(SITE_CONFIG_UID$3).findMany({
          filters: { domain },
          populate: ["channels", "template"],
          limit: 1
        });
        if (Array.isArray(records) && records.length > 0) {
          const site = records[0];
          ctx.state.siteId = site.id;
          ctx.state.siteDocumentId = site.documentId;
        }
      }
    } catch (error) {
      strapi2.log.error("[site-resolver] Failed to resolve site:", error);
    }
    await next();
  };
};
const SITE_CONFIG_UID$2 = "plugin::zhao-common.site-config";
const tenantContextResolver = (config2, { strapi: strapi2 }) => {
  return async (ctx, next) => {
    if (ctx.state?.siteId) {
      return await next();
    }
    const siteIdFromHeader = ctx.request?.headers?.["x-site-id"];
    const siteIdFromQuery = ctx.query?.siteId;
    const rawSiteId = siteIdFromHeader || siteIdFromQuery;
    if (rawSiteId) {
      try {
        const site = await strapi2.db.query(SITE_CONFIG_UID$2).findOne({
          where: { documentId: String(rawSiteId) }
        });
        if (site) {
          ctx.state.siteId = site.id;
          ctx.state.siteDocumentId = site.documentId;
        }
      } catch {
      }
    }
    return await next();
  };
};
const SITE_CONFIG_UID$1 = "plugin::zhao-common.site-config";
const TEMPLATE_UID$1 = "plugin::zhao-common.site-template";
const DEFAULT_SITE_CONFIG = {
  siteName: "圣麟教育",
  siteDescription: "让学习更有价值",
  seoKeywords: "教育,学习,课程",
  seoDescription: "圣麟教育平台",
  icpNumber: "",
  tencentMapKey: "",
  shareTitle: "圣麟教育",
  shareDescription: "让学习更有价值",
  customerServiceUrl: "",
  extraConfig: {
    // 认证
    authMode: "local",
    ssoEnabled: false,
    ssoLoginUrl: "",
    registerEnabled: true,
    inviteCodeRequired: false,
    wechatOfficialAccountEnabled: false,
    wechatMiniProgramEnabled: false,
    wechatOpenPlatformEnabled: false,
    alipayEnabled: false,
    douyinEnabled: false,
    passwordMinLength: 6,
    passwordRequireComplexity: false,
    // 渠道
    allowCrossChannel: false,
    channelInviteEnabled: true,
    defaultChannelScope: "all",
    // 积分
    pointsEnabled: true,
    signInPoints: 10,
    maxPointsPerDay: 0,
    redemptionEnabled: true,
    pointsExpireDays: 0,
    pointsMinRedemption: 100,
    pointsRuleEnabled: true,
    // 课程
    coursePreviewEnabled: true,
    lessonProgressEnabled: true,
    courseEnrollEnabled: true,
    courseCommentEnabled: false,
    courseRatingEnabled: false,
    // 用户
    userAvatarRequired: false,
    userPhoneRequired: true,
    userEmailRequired: false,
    // 支付
    paymentEnabled: false,
    // 通知
    smsEnabled: false,
    emailEnabled: false,
    // 安全
    captchaEnabled: false,
    rateLimitEnabled: true,
    loginAttemptLimit: 5,
    loginLockDuration: 30,
    sessionTimeout: 120,
    // 维护
    maintenanceMode: false,
    debugMode: false
  }
};
const getSoftDeleteModels = (strapi2) => Object.keys(strapi2.contentTypes).filter(
  (uid) => uid.startsWith("plugin::zhao-") && "deletedAt" in strapi2.contentTypes[uid].attributes
);
const addDeletedAtFilter = (event) => {
  const { params } = event;
  if (!params) return;
  if (!params.where) {
    params.where = {};
  }
  if ("deletedAt" in params.where) return;
  params.where.deletedAt = null;
};
const bootstrap = async ({ strapi: strapi2 }) => {
  try {
    const migrationService = strapi2.plugin("zhao-common").service("migration-runner");
    if (migrationService && typeof migrationService.runAllMigrations === "function") {
      await migrationService.runAllMigrations();
    }
  } catch (err) {
    strapi2.log.error(`[zhao-common] 数据库迁移执行失败: ${err.message}`);
    throw err;
  }
  strapi2.server.use(async (ctx, next) => {
    if (ctx.path?.startsWith("/admin") || ctx.path?.startsWith("/content-manager") || ctx.path?.startsWith("/health")) {
      return next();
    }
    const middleware = tenantContextResolver({}, { strapi: strapi2 });
    if (typeof middleware === "function") {
      return middleware(ctx, next);
    }
    return next();
  });
  strapi2.server.use(async (ctx, next) => {
    if (ctx.path?.startsWith("/admin") || ctx.path?.startsWith("/content-manager") || ctx.path?.startsWith("/health")) {
      return next();
    }
    const middleware = siteResolver({}, { strapi: strapi2 });
    if (typeof middleware === "function") {
      return middleware(ctx, next);
    }
    return next();
  });
  const existingConfig = await strapi2.documents(SITE_CONFIG_UID$1).findMany();
  if (!existingConfig || Array.isArray(existingConfig) && existingConfig.length === 0) {
    let defaultTemplate = null;
    const existingTemplates = await strapi2.documents(TEMPLATE_UID$1).findMany({
      filters: { isDefault: true }
    });
    if (Array.isArray(existingTemplates) && existingTemplates.length > 0) {
      defaultTemplate = existingTemplates[0];
    } else {
      defaultTemplate = await strapi2.documents(TEMPLATE_UID$1).create({
        data: {
          name: "默认模板",
          description: "系统默认配置模板，所有字段均可编辑",
          presetConfig: DEFAULT_SITE_CONFIG.extraConfig,
          fieldConstraints: {},
          enabled: true,
          isDefault: true
        }
      });
      strapi2.log.info(`[zhao-common] 默认模板已初始化`);
    }
    await strapi2.documents(SITE_CONFIG_UID$1).create({
      data: {
        ...DEFAULT_SITE_CONFIG,
        extraConfig: {},
        // 差异存储：默认站点关联默认模板，无需重复存储预设值
        template: defaultTemplate?.documentId ?? null
      }
    });
    strapi2.log.info(`[zhao-common] 站点配置已初始化`);
  }
  const softDeleteModels = getSoftDeleteModels(strapi2);
  if (softDeleteModels.length > 0) {
    strapi2.db.lifecycles.subscribe({
      models: softDeleteModels,
      beforeFindMany: addDeletedAtFilter,
      beforeFindOne: addDeletedAtFilter,
      beforeCount: addDeletedAtFilter
    });
    strapi2.log.info(
      `[zhao-common] soft-delete 自动过滤已注册，覆盖 ${softDeleteModels.length} 个 content-type`
    );
  }
  await initDefaultTemplates();
};
async function initDefaultTemplates() {
  const TEMPLATE_UID2 = "plugin::zhao-common.site-template";
  try {
    const existing = await strapi.db.query(TEMPLATE_UID2).count({ where: { name: "coursera-blue" } });
    if (existing > 0) return;
    const presets = [
      {
        name: "coursera-blue",
        displayName: "Coursera 学术蓝",
        presetConfig: {},
        fieldConstraints: {},
        themeConfig: JSON.stringify({
          primaryColor: "#0056D2",
          secondaryColor: "#F4F7F6",
          navStyle: "default",
          cardStyle: "shadow",
          tabBarColor: "#0056D2",
          tabBarActiveColor: "#FFFFFF"
        }),
        enabled: true,
        isDefault: true
      },
      {
        name: "khan-green",
        displayName: "Khan 学院绿",
        presetConfig: {},
        fieldConstraints: {},
        themeConfig: JSON.stringify({
          primaryColor: "#14BF95",
          secondaryColor: "#F5F9F8",
          navStyle: "default",
          cardStyle: "rounded",
          tabBarColor: "#14BF95",
          tabBarActiveColor: "#FFFFFF"
        }),
        enabled: true,
        isDefault: false
      },
      {
        name: "udemy-violet",
        displayName: "Udemy 鲜艳紫",
        presetConfig: {},
        fieldConstraints: {},
        themeConfig: JSON.stringify({
          primaryColor: "#A435F0",
          secondaryColor: "#FAF7FF",
          navStyle: "gradient",
          cardStyle: "shadow",
          tabBarColor: "#1C1D1F",
          tabBarActiveColor: "#A435F0"
        }),
        enabled: true,
        isDefault: false
      },
      {
        name: "edx-deep",
        displayName: "edX 深蓝学术",
        presetConfig: {},
        fieldConstraints: {},
        themeConfig: JSON.stringify({
          primaryColor: "#02262B",
          secondaryColor: "#E8ECEF",
          navStyle: "default",
          cardStyle: "default",
          tabBarColor: "#02262B",
          tabBarActiveColor: "#FFFFFF"
        }),
        enabled: true,
        isDefault: false
      },
      {
        name: "netease-red",
        displayName: "网易课堂红",
        presetConfig: {},
        fieldConstraints: {},
        themeConfig: JSON.stringify({
          primaryColor: "#D8232A",
          secondaryColor: "#FFF5F5",
          navStyle: "default",
          cardStyle: "shadow",
          tabBarColor: "#D8232A",
          tabBarActiveColor: "#FFFFFF"
        }),
        enabled: true,
        isDefault: false
      }
    ];
    for (const preset of presets) {
      await strapi.db.query(TEMPLATE_UID2).create({ data: preset });
    }
    strapi.log.info(`[bootstrap] 已生成 ${presets.length} 套预设模板`);
  } catch (e) {
    strapi.log.warn("[bootstrap] initDefaultTemplates failed:", e.message);
  }
}
const config$2 = {
  default: {},
  validator() {
  }
};
const logger = ({ strapi: strapi2 }) => ({
  info(message, meta) {
    strapi2.log.info(`[zhao-common] ${message}`, meta || {});
  },
  warn(message, meta) {
    strapi2.log.warn(`[zhao-common] ${message}`, meta || {});
  },
  error(message, meta) {
    strapi2.log.error(`[zhao-common] ${message}`, meta || {});
  },
  debug(message, meta) {
    strapi2.log.debug(`[zhao-common] ${message}`, meta || {});
  }
});
class AppError extends Error {
  constructor(code, context = {}, status = 400, message) {
    super(message || code);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.context = context;
  }
  /** 序列化为 JSON（用于 API 响应） */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      context: this.context
    };
  }
}
const ErrorCodes = {
  // ── 通用 (COMMON) ──
  UNKNOWN_ERROR: "COMMON_001"
};
const errorHandler = ({ strapi: _strapi }) => ({
  createError(code, context = {}, message) {
    return new AppError(code, context, 400, message);
  },
  wrapError(error, defaultCode = ErrorCodes.UNKNOWN_ERROR) {
    if (error instanceof AppError) return error;
    if (error instanceof Error) {
      return new AppError(defaultCode, { originalMessage: error.message }, 500, error.message);
    }
    return new AppError(defaultCode, {}, 500, "Unknown error");
  },
  formatError(error) {
    if (error instanceof AppError) {
      return { code: error.code, message: error.message };
    }
    if (error instanceof Error) {
      return { code: ErrorCodes.UNKNOWN_ERROR, message: error.message };
    }
    return { code: ErrorCodes.UNKNOWN_ERROR, message: "Unknown error" };
  }
});
const configManager = ({ strapi: strapi2 }) => ({
  get(key, defaultValue) {
    const pluginConfig = strapi2.plugin("zhao-common")?.config ?? {};
    return pluginConfig[key] ?? defaultValue;
  },
  getAll() {
    return strapi2.plugin("zhao-common")?.config ?? {};
  }
});
const MESSAGES = {
  // ── 通用 ──
  COMMON_001: "未知错误",
  COMMON_002: "参数校验失败: {reason}",
  COMMON_003: "资源不存在: {resource}",
  COMMON_004: "无权限访问",
  COMMON_005: "认证失败",
  COMMON_006: "配置错误: {detail}",
  // ── 渠道 ──
  CHANNEL_001: "渠道不存在 (id={channelId})",
  CHANNEL_002: "渠道层级深度超限（最大 2 级）",
  CHANNEL_003: "渠道已被禁用",
  CHANNEL_004: "邀请码不存在或已过期",
  CHANNEL_005: "成员不存在",
  CHANNEL_006: "渠道名已存在: {name}",
  CHANNEL_007: "用户未关联渠道",
  // ── 认证 ──
  AUTH_001: "缺少认证令牌",
  AUTH_002: "令牌无效或已过期",
  AUTH_003: "角色权限不足 (需要: {roles})",
  AUTH_004: "无权访问该渠道",
  AUTH_005: "资源所有者不匹配"
};
const i18n = ({ strapi: _strapi }) => {
  let messages = { ...MESSAGES };
  return {
    t(code, params) {
      let message = messages[code] || code;
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          message = message.replace(`{${key}}`, String(value));
        }
      }
      return message;
    },
    setMessages(newMessages) {
      messages = { ...messages, ...newMessages };
    }
  };
};
const resolveUid = (contentType) => contentType.includes("::") ? contentType : `plugin::${contentType}`;
const SOFT_DELETE_WHITELIST = /* @__PURE__ */ new Set([
  "plugin::zhao-tag.tag",
  "plugin::zhao-tag.knowledge-point",
  "plugin::zhao-quiz.quiz-exam",
  "plugin::zhao-quiz.quiz-batch",
  "plugin::zhao-quiz.quiz",
  "plugin::zhao-course.user-course-auth",
  "plugin::zhao-channel.channel",
  "plugin::zhao-course.course-lesson",
  "plugin::zhao-course.course-category",
  "plugin::zhao-course.course",
  "plugin::zhao-point.point-type",
  "plugin::zhao-point.point-rule",
  "plugin::zhao-point.point-redemption",
  "plugin::zhao-point.point-product",
  "plugin::zhao-point.pickup-location",
  // zhao-website CTs (18)
  "plugin::zhao-website.seo-config",
  "plugin::zhao-website.brand-info",
  "plugin::zhao-website.article",
  "plugin::zhao-website.article-category",
  "plugin::zhao-website.product",
  "plugin::zhao-website.case",
  "plugin::zhao-website.compliance",
  "plugin::zhao-website.faq",
  "plugin::zhao-website.tutorial",
  "plugin::zhao-website.lead",
  "plugin::zhao-website.visit-log",
  "plugin::zhao-website.interaction",
  "plugin::zhao-website.search-log",
  "plugin::zhao-website.knowledge-entity",
  "plugin::zhao-website.knowledge-relation",
  "plugin::zhao-website.ai-content-summary",
  "plugin::zhao-website.first-truth-policy",
  "plugin::zhao-website.download",
  // zhao-oss media-meta
  "plugin::zhao-oss.media-meta"
]);
function assertWhitelisted(uid) {
  if (!SOFT_DELETE_WHITELIST.has(uid)) {
    const e = new Error(`contentType "${uid}" 不支持软删除`);
    e.status = 400;
    throw e;
  }
}
const softDelete$1 = ({ strapi: strapi2 }) => ({
  /**
   * 软删除：将 deletedAt 设为当前时间
   * 使用 strapi.db.query() 直接操作，绕过自动过滤
   */
  async softDelete(contentType, documentId) {
    const uid = resolveUid(contentType);
    assertWhitelisted(uid);
    const model = strapi2.contentType(uid);
    if (!model) {
      strapi2.log.warn(`[zhao-common] softDelete: contentType "${uid}" not found`);
      return null;
    }
    const existing = await strapi2.db.query(uid).findOne({ where: { documentId } });
    if (!existing) {
      strapi2.log.warn(`[zhao-common] softDelete: document "${documentId}" not found in ${uid}`);
      return null;
    }
    if (existing.deletedAt) {
      strapi2.log.warn(`[zhao-common] softDelete: document "${documentId}" already soft-deleted`);
      return existing;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return strapi2.db.query(uid).update({
      where: { documentId },
      data: { deletedAt: now, updatedAt: now }
    });
  },
  /**
   * 恢复已软删除的记录
   * 使用 strapi.db.query() 直接操作，绕过自动过滤
   */
  async restore(contentType, documentId) {
    const uid = resolveUid(contentType);
    assertWhitelisted(uid);
    const model = strapi2.contentType(uid);
    if (!model) {
      strapi2.log.warn(`[zhao-common] restore: contentType "${uid}" not found`);
      return null;
    }
    const existing = await strapi2.db.query(uid).findOne({ where: { documentId, deletedAt: { $ne: null } } });
    if (!existing) {
      strapi2.log.warn(`[zhao-common] restore: document "${documentId}" not found in ${uid}`);
      return null;
    }
    if (!existing.deletedAt) {
      strapi2.log.warn(`[zhao-common] restore: document "${documentId}" is not soft-deleted`);
      return existing;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return strapi2.db.query(uid).update({
      where: { documentId },
      data: { deletedAt: null, updatedAt: now }
    });
  },
  /**
   * 查询已软删除的记录（管理端"回收站"视图）
   * 支持分页和排序
   */
  async findDeleted(contentType, options2 = {}) {
    const uid = resolveUid(contentType);
    assertWhitelisted(uid);
    const model = strapi2.contentType(uid);
    if (!model) {
      strapi2.log.warn(`[zhao-common] findDeleted: contentType "${uid}" not found`);
      return [];
    }
    const query = {
      where: { ...options2.filters && typeof options2.filters === "object" && !Array.isArray(options2.filters) ? options2.filters : {}, deletedAt: { $ne: null } }
    };
    if (options2.sort && typeof options2.sort === "string") query.orderBy = options2.sort;
    if (options2.pagination) {
      const pageSize = options2.pagination.pageSize ?? 25;
      query.limit = Math.min(Math.max(1, pageSize), 100);
      const page = Math.max(1, options2.pagination.page ?? 1);
      query.offset = (page - 1) * query.limit;
    }
    const results = await strapi2.db.query(uid).findMany(query);
    const total = await strapi2.db.query(uid).count({ where: query.where });
    return {
      results: results ?? [],
      pagination: {
        total,
        page: Math.max(1, options2.pagination.page ?? 1),
        pageSize: query.limit,
        pageCount: Math.ceil(total / query.limit)
      }
    };
  }
});
const UID$1 = "plugin::zhao-common.site-config";
const DEFAULT_CONFIG = {
  siteName: "",
  siteDescription: "",
  seoKeywords: "",
  seoDescription: "",
  tencentMapKey: "",
  shareTitle: "",
  shareDescription: "",
  customerServiceUrl: "",
  icpNumber: "",
  domain: "",
  extraConfig: null
};
const PUBLIC_FIELDS = [
  "siteName",
  "siteDescription",
  "seoKeywords",
  "seoDescription",
  "tencentMapKey",
  "shareTitle",
  "shareDescription",
  "icpNumber",
  "customerServiceUrl",
  "domain"
];
const siteConfig$2 = ({ strapi: strapi2 }) => ({
  /**
   * 获取站点配置，支持按 documentId 查询
   * 多租户安全：siteId 为空时不兜底，返回空配置，避免泄露其他租户数据
   */
  async getConfig(siteId) {
    if (siteId) {
      const record = await strapi2.documents(UID$1).findOne({ documentId: siteId, populate: ["channels", "template", "logo", "favicon", "shareImage"] });
      if (record) return record;
    }
    return { ...DEFAULT_CONFIG };
  },
  /**
   * 按 domain 查询站点配置
   */
  async getConfigByDomain(domain) {
    const records = await strapi2.documents(UID$1).findMany({
      filters: { domain },
      populate: ["channels", "template", "logo", "favicon", "shareImage"]
    });
    if (Array.isArray(records) && records.length > 0) {
      return records[0];
    }
    return null;
  },
  /**
   * 校验 domain 唯一性（非空时检查重复）
   */
  async _validateDomainUnique(domain, excludeDocumentId) {
    if (!domain || typeof domain !== "string" || !domain.trim()) return;
    const filters = { domain };
    const records = await strapi2.documents(UID$1).findMany({ filters });
    if (Array.isArray(records)) {
      for (const record of records) {
        if (record.documentId !== excludeDocumentId) {
          const e = new Error(`域名 "${domain}" 已被其他站点占用`);
          e.status = 409;
          throw e;
        }
      }
    }
  },
  /**
   * 更新站点配置
   */
  async updateConfig(documentId, data) {
    if (data.domain !== void 0) {
      await this._validateDomainUnique(data.domain, documentId);
    }
    return strapi2.documents(UID$1).update({ documentId, data });
  },
  /**
   * 创建站点配置
   */
  async createConfig(data) {
    if (data.domain !== void 0) {
      await this._validateDomainUnique(data.domain);
    }
    return strapi2.documents(UID$1).create({ data });
  },
  async deleteConfig(documentId) {
    return strapi2.documents(UID$1).delete({ documentId });
  },
  /**
   * 获取公开配置（不含敏感字段）
   * @deprecated 使用 config 服务的 getPublicConfig（支持模板合并）
   */
  async getPublicConfig(siteId) {
    const config2 = await this.getConfig(siteId);
    const result = {};
    for (const key of PUBLIC_FIELDS) {
      result[key] = config2[key] ?? DEFAULT_CONFIG[key];
    }
    if (config2.logo) result.logo = config2.logo;
    if (config2.favicon) result.favicon = config2.favicon;
    if (config2.shareImage) result.shareImage = config2.shareImage;
    return result;
  },
  /**
   * 获取用户可访问渠道（site channels ∪ user direct channels，按 numeric id 去重）
   * 跨插件复用：zhao-point getProducts 等场景调用
   * @param siteId site-config documentId
   * @param userId 用户 id
   * @returns 渠道列表 [{ id, documentId, name }]
   */
  async getAvailableChannels(siteId, userId) {
    const siteChannels = [];
    if (siteId) {
      const siteConfig2 = await this.getConfig(siteId);
      if (siteConfig2?.channels && Array.isArray(siteConfig2.channels)) {
        for (const ch of siteConfig2.channels) {
          siteChannels.push({
            id: ch.id,
            documentId: ch.documentId,
            name: ch.name
          });
        }
      }
    }
    const userChannels = [];
    if (userId) {
      const channelPermissionService = strapi2.plugin("zhao-channel")?.service("channel-permission");
      if (channelPermissionService && typeof channelPermissionService.getUserDirectChannels === "function") {
        const userChannelIds = await channelPermissionService.getUserDirectChannels(userId);
        if (Array.isArray(userChannelIds)) {
          const channels = await strapi2.db.query("plugin::zhao-channel.channel").findMany({
            where: { id: { $in: userChannelIds } },
            select: ["id", "documentId", "name"]
          });
          for (const ch of channels) {
            userChannels.push({
              id: ch.id,
              documentId: ch.documentId,
              name: ch.name
            });
          }
        }
      }
    }
    const merged = /* @__PURE__ */ new Map();
    for (const ch of [...siteChannels, ...userChannels]) {
      const key = String(ch.id);
      if (!merged.has(key)) {
        merged.set(key, ch);
      }
    }
    return Array.from(merged.values());
  }
});
const TEMPLATE_UID = "plugin::zhao-common.site-template";
const SITE_CONFIG_UID = "plugin::zhao-common.site-config";
function parseExtraConfig(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}
const siteTemplate$2 = ({ strapi: strapi2 }) => ({
  /**
   * 列出模板
   */
  async listTemplates(filters = {}) {
    const { pageSize, page, sort, ...safeFilters } = filters;
    return strapi2.documents(TEMPLATE_UID).findMany({ filters: safeFilters, populate: { sites: { fields: ["documentId"] } } });
  },
  /**
   * 获取模板
   */
  async getTemplate(documentId) {
    return strapi2.documents(TEMPLATE_UID).findOne({ documentId, populate: { sites: { fields: ["documentId"] } } });
  },
  /**
   * 创建模板
   */
  async createTemplate(data) {
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      const e = new Error("模板名称不能为空");
      e.status = 400;
      throw e;
    }
    if (data.presetConfig !== void 0 && (typeof data.presetConfig !== "object" || data.presetConfig === null || Array.isArray(data.presetConfig))) {
      const e = new Error("presetConfig 必须是 JSON 对象");
      e.status = 400;
      throw e;
    }
    if (data.fieldConstraints !== void 0 && (typeof data.fieldConstraints !== "object" || data.fieldConstraints === null || Array.isArray(data.fieldConstraints))) {
      const e = new Error("fieldConstraints 必须是 JSON 对象");
      e.status = 400;
      throw e;
    }
    if (data.isDefault) {
      await this._clearDefaultFlag();
    }
    return strapi2.documents(TEMPLATE_UID).create({ data });
  },
  /**
   * 更新模板
   */
  async updateTemplate(documentId, data) {
    if (data.name !== void 0 && (typeof data.name !== "string" || !data.name.trim())) {
      const e = new Error("模板名称不能为空");
      e.status = 400;
      throw e;
    }
    if (data.presetConfig !== void 0 && (typeof data.presetConfig !== "object" || data.presetConfig === null || Array.isArray(data.presetConfig))) {
      const e = new Error("presetConfig 必须是 JSON 对象");
      e.status = 400;
      throw e;
    }
    if (data.fieldConstraints !== void 0 && (typeof data.fieldConstraints !== "object" || data.fieldConstraints === null || Array.isArray(data.fieldConstraints))) {
      const e = new Error("fieldConstraints 必须是 JSON 对象");
      e.status = 400;
      throw e;
    }
    if (data.isDefault) {
      await this._clearDefaultFlag(documentId);
    }
    return strapi2.documents(TEMPLATE_UID).update({ documentId, data });
  },
  /**
   * 删除模板
   * 先清除关联站点的 template 引用，再删除模板
   */
  async deleteTemplate(documentId) {
    const template = await this.getTemplate(documentId);
    if (!template) {
      const e = new Error("模板不存在");
      e.status = 404;
      throw e;
    }
    if (template.isDefault) {
      const e = new Error("默认模板不可删除，请先将其他模板设为默认");
      e.status = 400;
      throw e;
    }
    const presetConfig = template.presetConfig && typeof template.presetConfig === "object" && !Array.isArray(template.presetConfig) ? template.presetConfig : {};
    const linkedSites = await strapi2.documents(SITE_CONFIG_UID).findMany({
      filters: { template: documentId }
    });
    if (Array.isArray(linkedSites)) {
      for (const site of linkedSites) {
        const safeExtra = site.extraConfig && typeof site.extraConfig === "object" && !Array.isArray(site.extraConfig) ? site.extraConfig : {};
        const extraConfig = { ...presetConfig, ...safeExtra };
        await strapi2.documents(SITE_CONFIG_UID).update({
          documentId: site.documentId,
          data: { template: null, extraConfig }
        });
      }
    }
    return strapi2.documents(TEMPLATE_UID).delete({ documentId });
  },
  /**
   * 获取默认模板
   */
  async getDefaultTemplate() {
    const records = await strapi2.documents(TEMPLATE_UID).findMany({
      filters: { isDefault: true, enabled: true }
    });
    if (Array.isArray(records) && records.length > 0) {
      return records[0];
    }
    const allRecords = await strapi2.documents(TEMPLATE_UID).findMany({
      filters: { enabled: true }
    });
    if (Array.isArray(allRecords) && allRecords.length > 0) {
      return allRecords[0];
    }
    return null;
  },
  /**
   * 将模板应用到站点
   * @param mode 'overwrite' 覆盖模式（模板预设值替换租户配置），'merge' 合并模式（租户自定义值保留，模板补充缺失字段）
   */
  async applyTemplateToSite(templateDocumentId, siteDocumentId, mode = "merge") {
    const template = await this.getTemplate(templateDocumentId);
    if (!template) {
      const e = new Error("模板不存在");
      e.status = 404;
      throw e;
    }
    if (template.enabled === false) {
      const e = new Error("模板已禁用，无法应用");
      e.status = 400;
      throw e;
    }
    let extraConfig;
    const currentSite = await strapi2.documents(SITE_CONFIG_UID).findOne({
      documentId: siteDocumentId,
      populate: ["template"]
    });
    if (!currentSite) {
      const e = new Error("站点不存在");
      e.status = 404;
      throw e;
    }
    if (mode === "overwrite") {
      extraConfig = {};
    } else {
      const safePreset = template.presetConfig && typeof template.presetConfig === "object" && !Array.isArray(template.presetConfig) ? template.presetConfig : {};
      const safeCurrentExtra = currentSite.extraConfig && typeof currentSite.extraConfig === "object" && !Array.isArray(currentSite.extraConfig) ? currentSite.extraConfig : {};
      const merged = {
        ...safePreset,
        ...safeCurrentExtra
      };
      extraConfig = {};
      for (const [key, value] of Object.entries(merged)) {
        if (!(key in safePreset) || value !== safePreset[key]) {
          extraConfig[key] = value;
        }
      }
    }
    await strapi2.documents(SITE_CONFIG_UID).update({
      documentId: siteDocumentId,
      data: {
        extraConfig,
        template: template.documentId
      }
    });
    return { success: true, templateName: template.name, mode };
  },
  /**
   * 获取合并后的配置（模板预设 + 租户自定义）
   * 租户自定义值覆盖模板预设值
   * @param siteConfig 站点配置对象（避免重复查询）
   */
  async getMergedConfig(siteConfig2) {
    if (!siteConfig2) {
      return { config: {}, meta: null };
    }
    const templateId = siteConfig2.template?.documentId ?? siteConfig2.template;
    let template = null;
    if (templateId) {
      template = await this.getTemplate(templateId);
    }
    const tenantEc = parseExtraConfig(siteConfig2.extraConfig);
    if (tenantEc.extraConfig) {
      const inner = parseExtraConfig(tenantEc.extraConfig);
      delete tenantEc.extraConfig;
      for (const [k, v] of Object.entries(inner)) {
        if (!(k in tenantEc) || tenantEc[k] === void 0) tenantEc[k] = v;
      }
    }
    if (!template || template.enabled === false) {
      return {
        config: tenantEc,
        meta: null
      };
    }
    const preset = parseExtraConfig(template.presetConfig);
    const mergedConfig = {
      ...preset,
      ...tenantEc
    };
    const fieldConstraints = parseExtraConfig(template.fieldConstraints);
    const meta = {
      templateId: template.documentId,
      templateName: template.name,
      fieldConstraints,
      presetKeys: Object.keys(preset)
    };
    return { config: mergedConfig, meta };
  },
  /**
   * 校验更新是否在模板约束范围内
   * 返回 { valid: true } 或 { valid: false, deniedFields: [...] }
   */
  async validateUpdate(siteId, updateData) {
    const siteConfigService = strapi2.plugin("zhao-common").service("site-config");
    const siteConfig2 = await siteConfigService.getConfig(siteId);
    if (!siteConfig2) {
      return { valid: true };
    }
    const templateId = siteConfig2.template?.documentId ?? siteConfig2.template;
    if (!templateId) {
      return { valid: true };
    }
    const template = await this.getTemplate(templateId);
    if (!template || template.enabled === false) {
      return { valid: true };
    }
    const constraints = template.fieldConstraints;
    if (!constraints || typeof constraints !== "object" || Array.isArray(constraints)) {
      return { valid: true };
    }
    const deniedFields = [];
    for (const key of Object.keys(updateData)) {
      const fieldConstraint = constraints[key];
      if (fieldConstraint && (fieldConstraint.editable === false || fieldConstraint.visible === false)) {
        deniedFields.push(key);
      }
    }
    if (deniedFields.length > 0) {
      return {
        valid: false,
        deniedFields,
        message: `以下字段受模板约束不可修改: ${deniedFields.join(", ")}`
      };
    }
    return { valid: true };
  },
  /**
   * 清除其他模板的 isDefault 标记（确保唯一性）
   * @param excludeDocumentId 排除的模板ID（更新时排除自身）
   */
  async _clearDefaultFlag(excludeDocumentId) {
    const defaults = await strapi2.documents(TEMPLATE_UID).findMany({
      filters: { isDefault: true }
    });
    if (Array.isArray(defaults)) {
      for (const tpl of defaults) {
        if (tpl.documentId !== excludeDocumentId) {
          await strapi2.documents(TEMPLATE_UID).update({
            documentId: tpl.documentId,
            data: { isDefault: false }
          });
        }
      }
    }
  }
});
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
const config$1 = ({ strapi: strapi2 }) => ({
  // ========== 站点配置 ==========
  async getSiteConfig(siteId) {
    try {
      const service = strapi2.plugin("zhao-common")?.service("site-config");
      if (service && typeof service.getConfig === "function") {
        const siteConfig2 = await service.getConfig(siteId);
        if (siteConfig2) {
          const templateService = strapi2.plugin("zhao-common")?.service("site-template");
          if (templateService && typeof templateService.getMergedConfig === "function") {
            const { config: config2, meta } = await templateService.getMergedConfig(siteConfig2);
            return {
              ...siteConfig2,
              extraConfig: config2,
              _meta: meta
            };
          }
        }
        return siteConfig2;
      }
      return null;
    } catch (error) {
      strapi2.log.warn("[config] getSiteConfig failed:", error.message);
      return null;
    }
  },
  async getSiteConfigList(params = {}) {
    try {
      const { page = 1, pageSize = 20, filters = {}, sort } = params;
      const query = {
        filters,
        populate: ["channels", "template"]
      };
      if (sort) query.sort = sort;
      if (page && pageSize) {
        const [results2, total] = await Promise.all([
          strapi2.documents("plugin::zhao-common.site-config").findMany({
            ...query,
            page,
            pageSize
          }),
          strapi2.documents("plugin::zhao-common.site-config").count({ filters })
        ]);
        return { results: results2, pagination: { page, pageSize, total } };
      }
      const results = await strapi2.documents("plugin::zhao-common.site-config").findMany(query);
      return { results, pagination: null };
    } catch (error) {
      strapi2.log.warn("[config] getSiteConfigList failed:", error.message);
      return { results: [], pagination: null };
    }
  },
  async updateSiteConfig(data, siteId) {
    try {
      const service = strapi2.plugin("zhao-common")?.service("site-config");
      if (service) {
        if (data.documentId) {
          const { documentId, ...updateData } = data;
          if (typeof service.updateConfig === "function") {
            return await service.updateConfig(documentId, updateData);
          }
        } else {
          const currentConfig = await service.getConfig(siteId);
          if (currentConfig?.documentId && typeof service.updateConfig === "function") {
            return await service.updateConfig(currentConfig.documentId, data);
          }
          if (typeof service.createConfig === "function") {
            return await service.createConfig(data);
          }
        }
      }
      return null;
    } catch (error) {
      strapi2.log.warn("[config] updateSiteConfig failed:", error.message);
      throw error;
    }
  },
  // ========== 三方配置（插件不存在时返回空） ==========
  async getThirdPartyConfigs(filters = {}) {
    try {
      const results = await strapi2.documents("plugin::zhao-third.third-party-config").findMany({
        filters,
        populate: []
      });
      return results;
    } catch (error) {
      strapi2.log.warn("[config] getThirdPartyConfigs: plugin not available");
      return [];
    }
  },
  async getThirdPartyConfig(documentId) {
    try {
      return await strapi2.documents("plugin::zhao-third.third-party-config").findOne({ documentId });
    } catch (error) {
      strapi2.log.warn("[config] getThirdPartyConfig: plugin not available");
      return null;
    }
  },
  async createThirdPartyConfig(data) {
    try {
      return await strapi2.documents("plugin::zhao-third.third-party-config").create({ data });
    } catch (error) {
      strapi2.log.warn("[config] createThirdPartyConfig: plugin not available");
      return null;
    }
  },
  async updateThirdPartyConfig(documentId, data) {
    try {
      return await strapi2.documents("plugin::zhao-third.third-party-config").update({ documentId, data });
    } catch (error) {
      strapi2.log.warn("[config] updateThirdPartyConfig: plugin not available");
      return null;
    }
  },
  async deleteThirdPartyConfig(documentId) {
    try {
      return await strapi2.documents("plugin::zhao-third.third-party-config").delete({ documentId });
    } catch (error) {
      strapi2.log.warn("[config] deleteThirdPartyConfig: plugin not available");
      return null;
    }
  },
  // ========== 积分配置 ==========
  async getPointsConfig() {
    try {
      const service = strapi2.plugin("zhao-point")?.service("config-service");
      if (service && typeof service.getConfig === "function") {
        return await service.getConfig();
      }
      return null;
    } catch (error) {
      strapi2.log.warn("[config] getPointsConfig failed:", error.message);
      return null;
    }
  },
  async updatePointsConfig(data) {
    try {
      const service = strapi2.plugin("zhao-point")?.service("config-service");
      if (service && typeof service.updateConfig === "function") {
        return await service.updateConfig(data);
      }
      return null;
    } catch (error) {
      strapi2.log.warn("[config] updatePointsConfig failed:", error.message);
      return null;
    }
  },
  // ========== OSS配置 ==========
  async getOssConfig() {
    try {
      const service = strapi2.plugin("zhao-oss")?.service("provider-registry");
      if (service) {
        const activeProviders = service.getActiveProviders();
        const primaryProvider = service.getPrimaryProvider();
        return {
          activeProviders,
          primaryProvider: primaryProvider ?? activeProviders[0] ?? null,
          providerTypes: service.getProviderTypes()
        };
      }
      return null;
    } catch (error) {
      strapi2.log.warn("[config] getOssConfig failed:", error.message);
      return null;
    }
  },
  async updateOssConfig(data) {
    const e = new Error("OSS配置更新功能未实现");
    e.status = 501;
    throw e;
  },
  // ========== SSO应用（插件不存在时返回空） ==========
  async getSsoApps(filters = {}) {
    try {
      return await strapi2.documents("plugin::zhao-sso.sso-app").findMany({
        filters,
        populate: []
      });
    } catch (error) {
      strapi2.log.warn("[config] getSsoApps: plugin not available");
      return [];
    }
  },
  async getSsoApp(documentId) {
    try {
      return await strapi2.documents("plugin::zhao-sso.sso-app").findOne({ documentId });
    } catch (error) {
      strapi2.log.warn("[config] getSsoApp: plugin not available");
      return null;
    }
  },
  async createSsoApp(data) {
    try {
      return await strapi2.documents("plugin::zhao-sso.sso-app").create({ data });
    } catch (error) {
      strapi2.log.warn("[config] createSsoApp: plugin not available");
      return null;
    }
  },
  async updateSsoApp(documentId, data) {
    try {
      return await strapi2.documents("plugin::zhao-sso.sso-app").update({ documentId, data });
    } catch (error) {
      strapi2.log.warn("[config] updateSsoApp: plugin not available");
      return null;
    }
  },
  async deleteSsoApp(documentId) {
    try {
      return await strapi2.documents("plugin::zhao-sso.sso-app").delete({ documentId });
    } catch (error) {
      strapi2.log.warn("[config] deleteSsoApp: plugin not available");
      return null;
    }
  },
  // ========== 公开配置（只返回非敏感字段，统一从 extraConfig 读取） ==========
  async getPublicConfig(siteId, channelId) {
    const result = {};
    try {
      const siteConfigService = strapi2.plugin("zhao-common")?.service("site-config");
      const templateService = strapi2.plugin("zhao-common")?.service("site-template");
      if (!siteConfigService) return result;
      const fullConfig = await siteConfigService.getConfig(siteId);
      if (!fullConfig) {
        return {
          site: {
            siteName: "",
            siteDescription: "",
            logo: "",
            favicon: "",
            shareTitle: "",
            shareDescription: "",
            shareImage: "",
            sharePath: "/pages/index/index",
            domain: ""
          },
          auth: {
            mode: "local",
            methods: ["password", "sms"],
            thirdPartyEnabled: false,
            ssoEnabled: false,
            ssoLoginUrl: null,
            registerEnabled: true,
            inviteCodeRequired: false
          },
          featureFlags: {
            sso: false,
            points: true,
            quiz: true,
            course: true,
            channel: true,
            thirdParty: true,
            oss: false,
            website: true,
            logistics: true,
            studio: true,
            pointsEnabled: true,
            coursePreviewEnabled: true,
            lessonProgressEnabled: true,
            courseEnrollEnabled: true,
            channelInviteEnabled: true,
            allowCrossChannel: false,
            redemptionEnabled: true,
            courseCommentEnabled: false,
            courseRatingEnabled: false,
            paymentEnabled: false
          },
          points: {
            moduleEnabled: true,
            earnEnabled: true,
            redeemEnabled: true,
            signInEnabled: true,
            tasksEnabled: true,
            signInPoints: 10,
            maxPointsPerDay: 0
          },
          theme: {
            primaryColor: "#667eea",
            secondaryColor: "#f0f2f5",
            navStyle: "default",
            cardStyle: "default",
            tabBarColor: "#667eea",
            tabBarActiveColor: "#ffffff"
          }
        };
      }
      const PUBLIC_FIELDS2 = [
        "siteName",
        "siteDescription",
        "seoKeywords",
        "seoDescription",
        "tencentMapKey",
        "shareTitle",
        "shareDescription",
        "icpNumber",
        "customerServiceUrl",
        "domain"
      ];
      const DEFAULT_CONFIG2 = {
        siteName: "",
        siteDescription: "",
        seoKeywords: "",
        seoDescription: "",
        tencentMapKey: "",
        shareTitle: "",
        shareDescription: "",
        icpNumber: "",
        customerServiceUrl: "",
        domain: ""
      };
      const sitePublic = {};
      for (const key of PUBLIC_FIELDS2) {
        sitePublic[key] = fullConfig?.[key] ?? DEFAULT_CONFIG2[key];
      }
      if (fullConfig?.logo) sitePublic.logo = fullConfig.logo;
      if (fullConfig?.favicon) sitePublic.favicon = fullConfig.favicon;
      if (fullConfig?.shareImage) sitePublic.shareImage = fullConfig.shareImage;
      result.site = sitePublic;
      let ec = {};
      const rawEc = fullConfig?.extraConfig;
      if (rawEc && typeof rawEc === "object" && !Array.isArray(rawEc)) {
        ec = rawEc;
      } else if (typeof rawEc === "string" && rawEc.trim()) {
        try {
          ec = JSON.parse(rawEc);
        } catch {
          ec = {};
        }
      }
      if (ec.extraConfig && typeof ec.extraConfig === "object" && !Array.isArray(ec.extraConfig)) {
        const inner = ec.extraConfig;
        delete ec.extraConfig;
        for (const [k, v] of Object.entries(inner)) {
          if (!(k in ec) || ec[k] === void 0) ec[k] = v;
        }
      } else if (typeof ec.extraConfig === "string" && ec.extraConfig.trim()) {
        try {
          const inner = JSON.parse(ec.extraConfig);
          delete ec.extraConfig;
          for (const [k, v] of Object.entries(inner)) {
            if (!(k in ec) || ec[k] === void 0) ec[k] = v;
          }
        } catch {
        }
      }
      if (templateService && typeof templateService.getMergedConfig === "function" && fullConfig) {
        const { config: config2 } = await templateService.getMergedConfig(fullConfig);
        ec = config2 ?? {};
      }
      if (channelId != null) {
        try {
          const isNumericId = typeof channelId === "number" || typeof channelId === "string" && /^\d+$/.test(channelId);
          const channel = await strapi2.db.query("plugin::zhao-channel.channel").findOne({
            where: isNumericId ? { id: Number(channelId) } : { documentId: channelId },
            select: ["extraConfig"]
          });
          if (channel?.extraConfig) {
            let channelEc = {};
            if (typeof channel.extraConfig === "string") {
              try {
                channelEc = JSON.parse(channel.extraConfig);
              } catch {
              }
            } else if (typeof channel.extraConfig === "object") {
              channelEc = channel.extraConfig;
            }
            ec = { ...ec, ...channelEc };
          }
        } catch (e) {
          strapi2.log.warn("[config] channel extraConfig merge failed:", e.message);
        }
      }
      sitePublic.sharePath = ec.sharePath ?? "/pages/index/index";
      const siteFeatureFlags = fullConfig?.featureFlags || {};
      const authMode = ec.authMode ?? "local";
      const wechatOfficialAccountEnabled = ec.wechatOfficialAccountEnabled === true;
      const wechatMiniProgramEnabled = ec.wechatMiniProgramEnabled === true;
      const wechatOpenPlatformEnabled = ec.wechatOpenPlatformEnabled === true;
      const alipayEnabled = ec.alipayEnabled === true;
      const douyinEnabled = ec.douyinEnabled === true;
      const thirdPartyEnabled = siteFeatureFlags.thirdParty ?? true;
      const methods = ["password", "sms"];
      if (authMode === "third" || thirdPartyEnabled) {
        methods.push("wechat");
      }
      if (authMode === "sso" || siteFeatureFlags.sso) {
        methods.push("sso");
      }
      result.auth = {
        mode: authMode,
        methods,
        wechatOfficialAccountEnabled,
        wechatMiniProgramEnabled,
        wechatOpenPlatformEnabled,
        alipayEnabled,
        douyinEnabled,
        thirdPartyEnabled,
        ssoEnabled: siteFeatureFlags.sso ?? true,
        ssoLoginUrl: ec.ssoLoginUrl ?? null,
        registerEnabled: ec.registerEnabled ?? true,
        inviteCodeRequired: ec.inviteCodeRequired ?? false
      };
      result.featureFlags = {
        // 粗粒度模块总开关（从 site-config.featureFlags 列读取）
        sso: siteFeatureFlags.sso ?? true,
        points: siteFeatureFlags.points ?? true,
        quiz: siteFeatureFlags.quiz ?? true,
        course: siteFeatureFlags.course ?? true,
        channel: siteFeatureFlags.channel ?? true,
        thirdParty: siteFeatureFlags.thirdParty ?? true,
        oss: siteFeatureFlags.oss ?? false,
        website: siteFeatureFlags.website ?? true,
        logistics: siteFeatureFlags.logistics ?? true,
        studio: siteFeatureFlags.studio ?? true,
        // 细粒度开关（从 extraConfig 合并后的 ec 读取）
        pointsEnabled: siteFeatureFlags.points ?? true,
        coursePreviewEnabled: ec.coursePreviewEnabled ?? true,
        lessonProgressEnabled: ec.lessonProgressEnabled ?? true,
        courseEnrollEnabled: ec.courseEnrollEnabled ?? true,
        channelInviteEnabled: ec.channelInviteEnabled ?? true,
        allowCrossChannel: ec.allowCrossChannel ?? false,
        allowCrossChannelPublish: ec.allowCrossChannelPublish ?? false,
        redemptionEnabled: ec.redemptionEnabled ?? true,
        courseCommentEnabled: ec.courseCommentEnabled ?? false,
        courseRatingEnabled: ec.courseRatingEnabled ?? false,
        paymentEnabled: ec.paymentEnabled ?? false,
        smsEnabled: ec.smsEnabled ?? false,
        emailEnabled: ec.emailEnabled ?? false,
        captchaEnabled: ec.captchaEnabled ?? false,
        rateLimitEnabled: ec.rateLimitEnabled ?? true,
        maintenanceMode: ec.maintenanceMode ?? false,
        debugMode: ec.debugMode ?? false
      };
      result.points = {
        moduleEnabled: siteFeatureFlags.points ?? true,
        earnEnabled: true,
        redeemEnabled: ec.redemptionEnabled ?? true,
        signInEnabled: true,
        tasksEnabled: true,
        signInPoints: ec.signInPoints ?? 10,
        maxPointsPerDay: ec.maxPointsPerDay ?? 0
      };
      let themeConfig = {};
      try {
        const rawTheme = fullConfig?.themeConfig;
        if (rawTheme && typeof rawTheme === "object" && !Array.isArray(rawTheme)) {
          themeConfig = rawTheme;
        } else if (typeof rawTheme === "string" && rawTheme.trim()) {
          themeConfig = JSON.parse(rawTheme);
        }
      } catch {
      }
      if (Object.keys(themeConfig).length === 0 && fullConfig?.template) {
        try {
          const templateId = typeof fullConfig.template === "object" ? fullConfig.template.id : fullConfig.template;
          const template = await strapi2.db.query("plugin::zhao-common.site-template").findOne({
            where: { id: templateId },
            select: ["themeConfig"]
          });
          if (template?.themeConfig) {
            themeConfig = typeof template.themeConfig === "string" ? JSON.parse(template.themeConfig) : template.themeConfig;
          }
        } catch {
        }
      }
      result.theme = {
        primaryColor: themeConfig.primaryColor ?? "#667eea",
        secondaryColor: themeConfig.secondaryColor ?? "#f0f2f5",
        navStyle: themeConfig.navStyle ?? "default",
        cardStyle: themeConfig.cardStyle ?? "default",
        tabBarColor: themeConfig.tabBarColor ?? "#667eea",
        tabBarActiveColor: themeConfig.tabBarActiveColor ?? "#ffffff"
      };
      const globalConfigService = strapi2.plugin("zhao-common")?.service("global-config");
      let moduleEnabled = {};
      let moduleTenantGrants = {};
      try {
        const globalConfig2 = await globalConfigService?.getGlobalConfig();
        moduleEnabled = globalConfig2?.moduleEnabled ?? {};
        moduleTenantGrants = globalConfig2?.moduleTenantGrants ?? {};
      } catch (e) {
        strapi2.log.warn("[config] global-config load failed:", e.message);
      }
      const currentTenantDocId = siteId ?? "";
      const moduleGrantedForCurrentTenant = {};
      for (const key of VISIBILITY_MODULES) {
        const globalEnabled = moduleEnabled[key] ?? false;
        const granted = moduleTenantGrants[key]?.includes(currentTenantDocId) ?? false;
        moduleGrantedForCurrentTenant[key] = globalEnabled || granted;
      }
      result.moduleEnabled = moduleEnabled;
      result.moduleGrantedForCurrentTenant = moduleGrantedForCurrentTenant;
      try {
        const permissionService = strapi2.plugin("zhao-auth")?.service("permission");
        if (permissionService && typeof permissionService.resolveModuleVisibility === "function") {
          result.moduleVisibility = await permissionService.resolveModuleVisibility(siteId);
        } else {
          result.moduleVisibility = fullConfig?.moduleVisibility ?? {};
        }
      } catch {
        result.moduleVisibility = fullConfig?.moduleVisibility ?? {};
      }
    } catch (error) {
      strapi2.log.warn("[config] getPublicConfig failed:", error.message);
    }
    return result;
  }
});
const MIGRATION_TABLE = "zhao_schema_migrations";
const PLUGIN_ORDER = [
  "zhao-common",
  "zhao-tag",
  "zhao-oss",
  "zhao-channel",
  "zhao-auth",
  "zhao-course",
  "zhao-point",
  "zhao-quiz",
  "zhao-third",
  "zhao-wealth",
  "zhao-sso",
  "zhao-studio",
  "zhao-website",
  "zhao-logistics"
];
function getPluginRoot(plugin) {
  try {
    const pluginMain = require.resolve(`${plugin}/strapi-server.js`, { paths: [process.cwd()] });
    return path__default.default.dirname(path__default.default.dirname(pluginMain));
  } catch {
    try {
      const currentFile = typeof __filename !== "undefined" ? __filename : module.filename;
      const migrationRunnerDir = path__default.default.dirname(String(currentFile));
      const serverDir = path__default.default.dirname(migrationRunnerDir);
      const pluginDir = path__default.default.dirname(serverDir);
      const pluginsDir = path__default.default.dirname(pluginDir);
      const targetPlugin = path__default.default.join(pluginsDir, plugin);
      if (fs__default.default.existsSync(targetPlugin)) {
        return targetPlugin;
      }
    } catch (e) {
    }
    return "";
  }
}
const migrationRunner = ({ strapi: strapi2 }) => ({
  async ensureMigrationTable() {
    const hasTable = await strapi2.db.connection.schema.hasTable(MIGRATION_TABLE);
    if (!hasTable) {
      await strapi2.db.connection.schema.createTable(MIGRATION_TABLE, (table) => {
        table.increments("id").primary();
        table.string("plugin", 64).notNullable();
        table.string("version", 32).notNullable();
        table.string("name", 255).notNullable();
        table.timestamp("executed_at").notNullable().defaultTo(strapi2.db.connection.fn.now());
        table.unique(["plugin", "version"]);
      });
      strapi2.log.info("[migration] 迁移记录表已创建");
    }
  },
  async getExecutedMigrations(plugin) {
    const rows = await strapi2.db.connection(MIGRATION_TABLE).where({ plugin }).select("version");
    return rows.map((r) => r.version);
  },
  async getMigrationFiles(plugin) {
    const pluginRoot = getPluginRoot(plugin);
    const migrationsDir = path__default.default.join(pluginRoot, "server", "database", "migrations");
    if (!fs__default.default.existsSync(migrationsDir)) {
      return [];
    }
    const files = fs__default.default.readdirSync(migrationsDir).filter((f) => f.endsWith(".js") || f.endsWith(".ts")).sort();
    const result = [];
    for (const file of files) {
      const match = file.match(/^(\d+)_(.+)\.(js|ts)$/);
      if (match) {
        result.push({
          version: match[1],
          name: match[2],
          filePath: path__default.default.join(migrationsDir, file)
        });
      }
    }
    return result;
  },
  async runMigration(plugin, version, name, filePath, direction = "up") {
    const migration = require(filePath);
    const fn = migration[direction];
    if (!fn) {
      if (direction === "down") return;
      throw new Error(`迁移脚本 ${filePath} 缺少 ${direction} 方法`);
    }
    const ctx = {
      strapi: strapi2,
      db: strapi2.db.connection
    };
    await fn(ctx);
    if (direction === "up") {
      await strapi2.db.connection(MIGRATION_TABLE).insert({
        plugin,
        version,
        name
      });
    } else {
      await strapi2.db.connection(MIGRATION_TABLE).where({ plugin, version }).del();
    }
  },
  async runAllMigrations() {
    await this.ensureMigrationTable();
    const enabledPlugins = Object.keys(strapi2.plugins).filter((p) => p.startsWith("zhao-"));
    const sortedPlugins = PLUGIN_ORDER.filter((p) => enabledPlugins.includes(p));
    let executedCount = 0;
    for (const plugin of sortedPlugins) {
      const files = await this.getMigrationFiles(plugin);
      if (files.length === 0) continue;
      const executed = await this.getExecutedMigrations(plugin);
      const pending = files.filter((f) => !executed.includes(f.version));
      if (pending.length === 0) continue;
      for (const file of pending) {
        try {
          await this.runMigration(plugin, file.version, file.name, file.filePath, "up");
          executedCount++;
        } catch (err) {
          strapi2.log.error(`[migration] ${plugin}: v${file.version} ${file.name} 执行失败: ${err.message}`);
          throw err;
        }
      }
    }
    if (executedCount > 0) {
      strapi2.log.info(`[migration] 数据库迁移完成，共执行 ${executedCount} 个`);
    }
  },
  async rollback(plugin, version) {
    await this.ensureMigrationTable();
    const files = await this.getMigrationFiles(plugin);
    const target = files.find((f) => f.version === version);
    if (!target) {
      throw new Error(`未找到迁移脚本: ${plugin} v${version}`);
    }
    const executed = await this.getExecutedMigrations(plugin);
    if (!executed.includes(version)) {
      throw new Error(`迁移未执行，无法回滚: ${plugin} v${version}`);
    }
    await this.runMigration(plugin, version, target.name, target.filePath, "down");
    strapi2.log.info(`[migration] ${plugin}: v${version} 回滚成功`);
  }
});
const UID = "plugin::zhao-common.global-config";
const globalConfig$2 = ({ strapi: strapi2 }) => ({
  async getGlobalConfig() {
    try {
      const result = await strapi2.documents(UID).findFirst({});
      return result || { moduleEnabled: {}, moduleTenantGrants: {}, moduleVisibility: {} };
    } catch (e) {
      strapi2.log.error("[global-config] getGlobalConfig failed:", e);
      return { moduleEnabled: {}, moduleTenantGrants: {}, moduleVisibility: {} };
    }
  },
  async updateGlobalConfig(data) {
    const existing = await this.getGlobalConfig();
    const documentId = existing?.documentId;
    const updateData = {
      moduleEnabled: data.moduleEnabled ?? existing.moduleEnabled ?? {},
      moduleTenantGrants: data.moduleTenantGrants ?? existing.moduleTenantGrants ?? {},
      moduleVisibility: data.moduleVisibility ?? existing.moduleVisibility ?? {}
    };
    if (documentId) {
      return await strapi2.documents(UID).update({ documentId, data: updateData });
    } else {
      return await strapi2.documents(UID).create({ data: updateData });
    }
  }
});
const services = {
  logger,
  "error-handler": errorHandler,
  "config-manager": configManager,
  i18n,
  "soft-delete": softDelete$1,
  "site-config": siteConfig$2,
  "site-template": siteTemplate$2,
  config: config$1,
  "migration-runner": migrationRunner,
  "global-config": globalConfig$2
};
const kind$2 = "collectionType";
const collectionName$2 = "zhao_site_configs";
const info$2 = { "singularName": "site-config", "pluralName": "site-configs", "displayName": "站点配置", "description": "站点通用配置（多租户）" };
const options$2 = { "draftAndPublish": false };
const attributes$2 = { "siteName": { "type": "string", "maxLength": 100 }, "siteDescription": { "type": "text" }, "logo": { "type": "media", "multiple": false, "required": false, "allowedTypes": ["images"] }, "favicon": { "type": "media", "multiple": false, "required": false, "allowedTypes": ["images"] }, "icpNumber": { "type": "string", "maxLength": 50 }, "seoKeywords": { "type": "string", "maxLength": 500 }, "seoDescription": { "type": "text" }, "tencentMapKey": { "type": "string", "maxLength": 64 }, "shareTitle": { "type": "string", "maxLength": 100 }, "shareDescription": { "type": "string", "maxLength": 200 }, "shareImage": { "type": "media", "multiple": false, "required": false, "allowedTypes": ["images"] }, "customerServiceUrl": { "type": "string", "maxLength": 500 }, "domain": { "type": "string", "maxLength": 255, "unique": true }, "channels": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-channel.channel", "mappedBy": "sites" }, "featureFlags": { "type": "json", "default": { "sso": false, "points": true, "quiz": true, "course": true, "channel": true, "thirdParty": true, "oss": false, "website": true, "logistics": true, "studio": true } }, "moduleVisibility": { "type": "json", "default": {} }, "template": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-template", "inversedBy": "sites" }, "extraConfig": { "type": "json" }, "themeConfig": { "type": "json", "default": "{}" }, "channelUsage": { "type": "enumeration", "enum": ["site_only", "site_and_cross", "site_cross_user"], "default": "site_cross_user", "required": true }, "tags": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-tag.tag", "mappedBy": "site" }, "tagGroups": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-tag.tag-group", "mappedBy": "site" }, "website_seo_config": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-website.seo-config", "mappedBy": "site" }, "website_brand_info": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-website.brand-info", "mappedBy": "site" }, "website_articles": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.article", "mappedBy": "site" }, "website_article_categories": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.article-category", "mappedBy": "site" }, "website_cases": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.case", "mappedBy": "site" }, "website_faqs": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.faq", "mappedBy": "site" }, "website_tutorials": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.tutorial", "mappedBy": "site" }, "website_compliances": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.compliance", "mappedBy": "site" }, "website_downloads": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.download", "mappedBy": "site" }, "website_ai_summaries": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.ai-content-summary", "mappedBy": "site" }, "website_first_truths": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.first-truth-policy", "mappedBy": "site" }, "website_knowledge_entities": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.knowledge-entity", "mappedBy": "site" }, "website_knowledge_relations": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.knowledge-relation", "mappedBy": "site" }, "website_leads": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.lead", "mappedBy": "site" }, "website_interactions": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.interaction", "mappedBy": "site" }, "website_search_logs": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.search-log", "mappedBy": "site" }, "website_visit_logs": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.visit-log", "mappedBy": "site" }, "website_products": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.product", "mappedBy": "site" }, "logistics_tracking_providers": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.tracking-provider", "mappedBy": "site" }, "logistics_tracking_shipments": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.tracking-shipment", "mappedBy": "site" }, "logistics_tracking_nodes": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.tracking-node", "mappedBy": "site" }, "logistics_subscriptions": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.subscription", "mappedBy": "site" }, "logistics_quote_requests": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.quote-request", "mappedBy": "site" }, "logistics_quote_price_rules": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.quote-price-rule", "mappedBy": "site" }, "logistics_quote_price_formulas": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.quote-price-formula", "mappedBy": "site" }, "logistics_quote_field_rules": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.quote-field-rule", "mappedBy": "site" }, "logistics_customer_profiles": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.customer-profile", "mappedBy": "site" }, "logistics_conversion_events": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.conversion-event", "mappedBy": "site" }, "logistics_conversion_funnels": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.conversion-funnel", "mappedBy": "site" }, "logistics_contact_matrices": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.contact-matrix", "mappedBy": "site" }, "logistics_landing_pages": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.landing-page", "mappedBy": "site" }, "logistics_intent_orders": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.intent-order", "mappedBy": "site" }, "logistics_referrals": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.referral", "mappedBy": "site" }, "logistics_reviews": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.review", "mappedBy": "site" }, "studio_sync_events": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-studio.sync-event", "mappedBy": "site" }, "website_brand_voices": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-website.brand-voice", "mappedBy": "site" } };
const siteConfig$1 = {
  kind: kind$2,
  collectionName: collectionName$2,
  info: info$2,
  options: options$2,
  attributes: attributes$2
};
const kind$1 = "collectionType";
const collectionName$1 = "zhao_site_templates";
const info$1 = { "singularName": "site-template", "pluralName": "site-templates", "displayName": "站点模板", "description": "租户配置模板，定义预设值和字段约束" };
const options$1 = { "draftAndPublish": false };
const attributes$1 = { "name": { "type": "string", "required": true, "maxLength": 100 }, "displayName": { "type": "string", "maxLength": 100 }, "description": { "type": "text" }, "presetConfig": { "type": "json", "required": true }, "fieldConstraints": { "type": "json", "required": true }, "enabled": { "type": "boolean", "default": true }, "isDefault": { "type": "boolean", "default": false }, "sites": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-common.site-config", "mappedBy": "template" }, "themeConfig": { "type": "json", "default": "{}" } };
const siteTemplate$1 = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  attributes: attributes$1
};
const kind = "collectionType";
const collectionName = "zhao_global_configs";
const info = { "singularName": "global-config", "pluralName": "global-configs", "displayName": "全局配置", "description": "跨租户的全局模块开关，优先级最高，仅 admin 可改" };
const options = { "draftAndPublish": false };
const attributes = { "moduleEnabled": { "type": "json", "default": { "website": false, "logistics": false, "studio": false, "points": true, "course": true, "quiz": true, "channel": true, "sso": false, "thirdParty": false, "oss": false, "payment": false, "community": false, "forum": false } }, "moduleTenantGrants": { "type": "json", "default": {} }, "moduleVisibility": { "type": "json", "default": {} } };
const globalConfig$1 = {
  kind,
  collectionName,
  info,
  options,
  attributes
};
const contentTypes = {
  "site-config": { schema: siteConfig$1 },
  "site-template": { schema: siteTemplate$1 },
  "global-config": { schema: globalConfig$1 }
};
function getChannelScopeService(strapi2) {
  return strapi2.plugin("zhao-auth")?.service("channel-scope");
}
function buildThirdPartySiteFilter(strapi2, ctx) {
  const scope = ctx.state?.channelScope;
  const svc = getChannelScopeService(strapi2);
  if (!svc) return null;
  const channelFilter = svc.buildChannelFilter(scope, "channels");
  if (!channelFilter) return null;
  return { site: channelFilter };
}
async function assertThirdPartyInScope(strapi2, ctx, record) {
  const scope = ctx.state?.channelScope;
  if (!scope || scope.all) return;
  if (!record?.site) return;
  const site = await strapi2.documents("plugin::zhao-common.site-config").findOne({ documentId: record.site.documentId, populate: ["channels"] });
  if (!site) return;
  const svc = getChannelScopeService(strapi2);
  if (svc?.assertRecordInScope) {
    svc.assertRecordInScope(scope, site, "channels");
  }
}
async function validateChannelsAgainstScope(strapi2, channelDocumentIds, scope) {
  if (!scope || scope.all === true) return;
  if (channelDocumentIds.length === 0) {
    const e = new Error("请选择至少一个渠道");
    e.status = 400;
    throw e;
  }
  const allowedIds = Array.isArray(scope.channelIds) ? scope.channelIds : [];
  if (allowedIds.length === 0) {
    const e = new Error("您没有任何渠道权限，无法创建租户");
    e.status = 400;
    throw e;
  }
  const selected = await strapi2.db.query("plugin::zhao-channel.channel").findMany({
    where: { documentId: { $in: channelDocumentIds } },
    select: ["id", "documentId", "name"]
  });
  const invalid = selected.find((ch) => !allowedIds.includes(ch.id));
  if (invalid) {
    const e = new Error(`无权操作渠道 ${invalid.name || invalid.documentId}`);
    e.status = 400;
    throw e;
  }
}
async function syncChannelsForSite(strapi2, siteConfigDocumentId, channelDocumentIds) {
  const siteConfig2 = await strapi2.db.query("plugin::zhao-common.site-config").findOne({
    where: { documentId: siteConfigDocumentId },
    select: ["id"]
  });
  if (!siteConfig2) return;
  let channelIds = [];
  if (channelDocumentIds.length > 0) {
    const numericIds = [];
    const docIds = [];
    for (const v of channelDocumentIds) {
      if (typeof v === "number" || /^\d+$/.test(String(v))) {
        numericIds.push(Number(v));
      } else {
        docIds.push(String(v));
      }
    }
    if (numericIds.length > 0) {
      const byId = await strapi2.db.query("plugin::zhao-channel.channel").findMany({
        where: { id: { $in: numericIds } },
        select: ["id"]
      });
      channelIds.push(...byId.map((c) => c.id));
    }
    if (docIds.length > 0) {
      const byDoc = await strapi2.db.query("plugin::zhao-channel.channel").findMany({
        where: { documentId: { $in: docIds } },
        select: ["id"]
      });
      channelIds.push(...byDoc.map((c) => c.id));
    }
    channelIds = Array.from(new Set(channelIds));
  }
  const knex = strapi2.db.connection;
  await knex.transaction(async (trx) => {
    await trx("zhao_channels_sites_lnk").where("site_config_id", siteConfig2.id).del();
    if (channelIds.length > 0) {
      const rows = channelIds.map((cid) => ({ channel_id: cid, site_config_id: siteConfig2.id }));
      await trx("zhao_channels_sites_lnk").insert(rows);
    }
  });
}
const config = ({ strapi: strapi2 }) => ({
  // ========== 站点配置 ==========
  async getSiteList(ctx) {
    try {
      const service = strapi2.plugin("zhao-common").service("config");
      const { page, pageSize, filters, sort } = ctx.query || {};
      const result = await service.getSiteConfigList({
        page: page ? parseInt(page, 10) : void 0,
        pageSize: pageSize ? parseInt(pageSize, 10) : void 0,
        filters,
        sort
      });
      ctx.body = {
        data: result.results,
        meta: result.pagination || void 0
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },
  async getSite(ctx) {
    try {
      const siteId = ctx.state?.siteId;
      if (!siteId) {
        ctx.status = 400;
        ctx.body = { error: "缺少站点标识" };
        return;
      }
      const service = strapi2.plugin("zhao-common").service("config");
      const siteConfig2 = await service.getSiteConfig(siteId);
      if (!siteConfig2) {
        ctx.status = 404;
        ctx.body = { error: "站点配置不存在" };
        return;
      }
      const ec = siteConfig2.extraConfig ?? {};
      const { extraConfig, _meta, ...siteFields } = siteConfig2;
      const safeEc = {};
      for (const [key, value] of Object.entries(ec)) {
        if (!(key in siteFields)) {
          safeEc[key] = value;
        }
      }
      const data = {
        ...siteFields,
        ...safeEc,
        authMode: ec.authMode ?? "local",
        defaultChannelScope: ec.defaultChannelScope ?? "all",
        _meta: _meta ?? null
      };
      ctx.body = { data };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },
  async getSiteOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const service = strapi2.plugin("zhao-common").service("config");
      const siteConfig2 = await service.getSiteConfig(documentId);
      if (!siteConfig2) {
        ctx.status = 404;
        ctx.body = { error: "站点配置不存在" };
        return;
      }
      const ec = siteConfig2.extraConfig ?? {};
      const { extraConfig, _meta, ...siteFields } = siteConfig2;
      const safeEc = {};
      for (const [key, value] of Object.entries(ec)) {
        if (!(key in siteFields)) {
          safeEc[key] = value;
        }
      }
      const data = {
        ...siteFields,
        ...safeEc,
        authMode: ec.authMode ?? "local",
        defaultChannelScope: ec.defaultChannelScope ?? "all",
        _meta: _meta ?? null
      };
      ctx.body = { data };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },
  async createSite(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const siteConfigService = strapi2.plugin("zhao-common")?.service("site-config");
      if (!siteConfigService || typeof siteConfigService.createConfig !== "function") {
        ctx.status = 500;
        ctx.body = { error: "站点配置服务不可用" };
        return;
      }
      const SITE_FIELDS = /* @__PURE__ */ new Set([
        "siteName",
        "siteDescription",
        "logo",
        "favicon",
        "icpNumber",
        "seoKeywords",
        "seoDescription",
        "tencentMapKey",
        "shareTitle",
        "shareDescription",
        "shareImage",
        "customerServiceUrl",
        "featureFlags",
        "domain",
        "template",
        "themeConfig"
      ]);
      const RELATION_FIELDS = /* @__PURE__ */ new Set([]);
      const CHANNELS_FIELD = "channels";
      const BLOCKED_FIELDS = /* @__PURE__ */ new Set([
        "documentId",
        "createdAt",
        "updatedAt",
        "createdBy",
        "updatedBy",
        "publishedAt",
        "_meta"
      ]);
      const siteData = {};
      const extraData = {};
      let channelIds = [];
      for (const [key, value] of Object.entries(body)) {
        if (BLOCKED_FIELDS.has(key)) continue;
        if (key === CHANNELS_FIELD && Array.isArray(value)) {
          channelIds = value.map(
            (ch) => typeof ch === "object" ? ch.documentId || ch.id : ch
          );
        } else if (SITE_FIELDS.has(key)) {
          siteData[key] = value;
        } else if (RELATION_FIELDS.has(key)) {
          siteData[key] = value;
        } else {
          extraData[key] = value;
        }
      }
      await validateChannelsAgainstScope(strapi2, channelIds, ctx.state?.channelScope);
      if (Object.keys(extraData).length > 0) {
        siteData.extraConfig = extraData;
      }
      const saved = await siteConfigService.createConfig(siteData);
      if (!saved) {
        ctx.status = 500;
        ctx.body = { error: "创建站点配置失败" };
        return;
      }
      if (saved?.documentId) {
        await syncChannelsForSite(strapi2, saved.documentId, channelIds);
      }
      if (!saved) {
        ctx.status = 500;
        ctx.body = { error: "创建站点配置失败" };
        return;
      }
      const configService = strapi2.plugin("zhao-common").service("config");
      const siteConfig2 = await configService.getSiteConfig(saved.documentId);
      const ec = siteConfig2?.extraConfig ?? {};
      const { extraConfig, _meta, ...siteFields } = siteConfig2 ?? {};
      const safeEc = {};
      for (const [key, value] of Object.entries(ec)) {
        if (!(key in siteFields)) {
          safeEc[key] = value;
        }
      }
      const data = {
        ...siteFields,
        ...safeEc,
        documentId: saved.documentId,
        // 确保 documentId 被返回
        authMode: ec.authMode ?? "local",
        defaultChannelScope: ec.defaultChannelScope ?? "all",
        _meta: _meta ?? null
      };
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async updateSite(ctx) {
    try {
      const siteId = ctx.state?.siteId;
      if (!siteId) {
        ctx.status = 400;
        ctx.body = { error: "缺少站点标识" };
        return;
      }
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi2.plugin("zhao-common").service("config");
      const SITE_FIELDS = /* @__PURE__ */ new Set([
        "siteName",
        "siteDescription",
        "logo",
        "favicon",
        "icpNumber",
        "seoKeywords",
        "seoDescription",
        "tencentMapKey",
        "shareTitle",
        "shareDescription",
        "shareImage",
        "customerServiceUrl",
        "featureFlags",
        "domain",
        "template"
      ]);
      const RELATION_FIELDS = /* @__PURE__ */ new Set([]);
      const CHANNELS_FIELD = "channels";
      const NULLABLE_SITE_FIELDS = /* @__PURE__ */ new Set([
        "logo",
        "favicon",
        "shareImage"
      ]);
      const BLOCKED_FIELDS = /* @__PURE__ */ new Set([
        "documentId",
        "createdAt",
        "updatedAt",
        "createdBy",
        "updatedBy",
        "publishedAt",
        "_meta"
      ]);
      const siteData = {};
      const extraData = {};
      const deleteKeys = [];
      let channelIds = [];
      let channelsTouched = false;
      for (const [key, value] of Object.entries(body)) {
        if (BLOCKED_FIELDS.has(key)) continue;
        if (key === "extraConfig" && value && typeof value === "object" && !Array.isArray(value)) {
          for (const [ek, ev] of Object.entries(value)) {
            extraData[ek] = ev;
          }
          continue;
        }
        if (key === CHANNELS_FIELD) {
          channelsTouched = true;
          if (Array.isArray(value)) {
            channelIds = value.map(
              (ch) => typeof ch === "object" ? ch.documentId || ch.id : ch
            );
          }
        } else if (SITE_FIELDS.has(key)) {
          if (value === null && !NULLABLE_SITE_FIELDS.has(key)) continue;
          siteData[key] = value;
        } else if (RELATION_FIELDS.has(key)) {
          siteData[key] = value;
        } else if (value === null) {
          deleteKeys.push(key);
        } else {
          extraData[key] = value;
        }
      }
      const templateService = strapi2.plugin("zhao-common")?.service("site-template");
      if (templateService && typeof templateService.validateUpdate === "function") {
        const validation = await templateService.validateUpdate(siteId, { ...extraData, ...siteData });
        if (!validation.valid) {
          const e = new Error(validation.message);
          e.status = 403;
          e.deniedFields = validation.deniedFields;
          throw e;
        }
      }
      const siteConfigService = strapi2.plugin("zhao-common")?.service("site-config");
      const currentConfig = await siteConfigService.getConfig(siteId);
      if (!currentConfig) {
        ctx.status = 404;
        ctx.body = { error: "站点配置不存在" };
        return;
      }
      const safeCurrentExtra = currentConfig?.extraConfig && typeof currentConfig.extraConfig === "object" && !Array.isArray(currentConfig.extraConfig) ? currentConfig.extraConfig : {};
      const mergedExtra = { ...safeCurrentExtra, ...extraData };
      for (const key of deleteKeys) {
        delete mergedExtra[key];
      }
      if (mergedExtra.extraConfig !== void 0) {
        let inner = null;
        if (mergedExtra.extraConfig && typeof mergedExtra.extraConfig === "object" && !Array.isArray(mergedExtra.extraConfig)) {
          inner = mergedExtra.extraConfig;
        } else if (typeof mergedExtra.extraConfig === "string" && mergedExtra.extraConfig.trim()) {
          try {
            inner = JSON.parse(mergedExtra.extraConfig);
          } catch {
            inner = null;
          }
        }
        delete mergedExtra.extraConfig;
        if (inner && typeof inner === "object") {
          for (const [k, v] of Object.entries(inner)) {
            if (!(k in mergedExtra) || mergedExtra[k] === void 0) mergedExtra[k] = v;
          }
        }
      }
      if (templateService && typeof templateService.getTemplate === "function" && currentConfig) {
        const templateId = currentConfig.template?.documentId ?? currentConfig.template;
        if (templateId) {
          const template = await templateService.getTemplate(templateId);
          const presetConfig = template?.presetConfig;
          if (presetConfig && typeof presetConfig === "object" && !Array.isArray(presetConfig) && template?.enabled !== false) {
            for (const key of Object.keys(mergedExtra)) {
              if (key in presetConfig && mergedExtra[key] === presetConfig[key]) {
                delete mergedExtra[key];
              }
            }
          }
        }
      }
      const saveData = {
        ...siteData,
        extraConfig: mergedExtra,
        ...currentConfig?.documentId ? { documentId: currentConfig.documentId } : {}
      };
      const saved = await service.updateSiteConfig(saveData, siteId);
      if (channelsTouched && saved?.documentId) {
        try {
          await syncChannelsForSite(strapi2, saved.documentId, channelIds);
        } catch (e) {
          strapi2.log.warn(`[config] 更新渠道关联失败: ${e.message}`);
        }
      }
      const savedSiteConfig = await service.getSiteConfig(siteId);
      const fullEc = savedSiteConfig?.extraConfig ?? {};
      const { extraConfig: _ec, _meta: _m, ...savedFields } = savedSiteConfig ?? {};
      const safeFullEc = {};
      for (const [key, value] of Object.entries(fullEc)) {
        if (!(key in savedFields)) {
          safeFullEc[key] = value;
        }
      }
      const data = {
        ...savedFields,
        ...safeFullEc,
        authMode: fullEc.authMode ?? "local",
        defaultChannelScope: fullEc.defaultChannelScope ?? "all",
        _meta: _m ?? null
      };
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message, deniedFields: error.deniedFields };
    }
  },
  async updateSiteById(ctx) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi2.plugin("zhao-common").service("config");
      const SITE_FIELDS = /* @__PURE__ */ new Set([
        "siteName",
        "siteDescription",
        "logo",
        "favicon",
        "icpNumber",
        "seoKeywords",
        "seoDescription",
        "tencentMapKey",
        "shareTitle",
        "shareDescription",
        "shareImage",
        "customerServiceUrl",
        "featureFlags",
        "domain",
        "template",
        "themeConfig"
      ]);
      const RELATION_FIELDS = /* @__PURE__ */ new Set([]);
      const CHANNELS_FIELD = "channels";
      const NULLABLE_SITE_FIELDS = /* @__PURE__ */ new Set(["logo", "favicon", "shareImage"]);
      const BLOCKED_FIELDS = /* @__PURE__ */ new Set([
        "documentId",
        "createdAt",
        "updatedAt",
        "createdBy",
        "updatedBy",
        "publishedAt",
        "_meta"
      ]);
      const siteData = {};
      const extraData = {};
      const deleteKeys = [];
      let channelIds = [];
      let channelsTouched = false;
      for (const [key, value] of Object.entries(body)) {
        if (BLOCKED_FIELDS.has(key)) continue;
        if (key === "extraConfig" && value && typeof value === "object" && !Array.isArray(value)) {
          for (const [ek, ev] of Object.entries(value)) {
            extraData[ek] = ev;
          }
          continue;
        }
        if (key === CHANNELS_FIELD) {
          channelsTouched = true;
          if (Array.isArray(value)) {
            channelIds = value.map(
              (ch) => typeof ch === "object" ? ch.documentId || ch.id : ch
            );
          }
        } else if (SITE_FIELDS.has(key)) {
          if (value === null && !NULLABLE_SITE_FIELDS.has(key)) continue;
          siteData[key] = value;
        } else if (RELATION_FIELDS.has(key)) {
          siteData[key] = value;
        } else if (value === null) {
          deleteKeys.push(key);
        } else {
          extraData[key] = value;
        }
      }
      await validateChannelsAgainstScope(strapi2, channelIds, ctx.state?.channelScope);
      const templateService = strapi2.plugin("zhao-common")?.service("site-template");
      if (templateService && typeof templateService.validateUpdate === "function") {
        const validation = await templateService.validateUpdate(documentId, { ...extraData, ...siteData });
        if (!validation.valid) {
          const e = new Error(validation.message);
          e.status = 403;
          e.deniedFields = validation.deniedFields;
          throw e;
        }
      }
      const siteConfigService = strapi2.plugin("zhao-common")?.service("site-config");
      const currentConfig = await siteConfigService.getConfig(documentId);
      if (!currentConfig) {
        ctx.status = 404;
        ctx.body = { error: "站点配置不存在" };
        return;
      }
      const safeCurrentExtra = currentConfig?.extraConfig && typeof currentConfig.extraConfig === "object" && !Array.isArray(currentConfig.extraConfig) ? currentConfig.extraConfig : {};
      const mergedExtra = { ...safeCurrentExtra, ...extraData };
      for (const key of deleteKeys) {
        delete mergedExtra[key];
      }
      if (mergedExtra.extraConfig !== void 0) {
        let inner = null;
        if (mergedExtra.extraConfig && typeof mergedExtra.extraConfig === "object" && !Array.isArray(mergedExtra.extraConfig)) {
          inner = mergedExtra.extraConfig;
        } else if (typeof mergedExtra.extraConfig === "string" && mergedExtra.extraConfig.trim()) {
          try {
            inner = JSON.parse(mergedExtra.extraConfig);
          } catch {
            inner = null;
          }
        }
        delete mergedExtra.extraConfig;
        if (inner && typeof inner === "object") {
          for (const [k, v] of Object.entries(inner)) {
            if (!(k in mergedExtra) || mergedExtra[k] === void 0) mergedExtra[k] = v;
          }
        }
      }
      if (templateService && typeof templateService.getTemplate === "function" && currentConfig) {
        const templateId = currentConfig.template?.documentId ?? currentConfig.template;
        if (templateId) {
          const template = await templateService.getTemplate(templateId);
          const presetConfig = template?.presetConfig;
          if (presetConfig && typeof presetConfig === "object" && !Array.isArray(presetConfig) && template?.enabled !== false) {
            for (const key of Object.keys(mergedExtra)) {
              if (key in presetConfig && mergedExtra[key] === presetConfig[key]) {
                delete mergedExtra[key];
              }
            }
          }
        }
      }
      const saveData = {
        ...siteData,
        extraConfig: mergedExtra,
        documentId
      };
      const saved = await service.updateSiteConfig(saveData, documentId);
      if (channelsTouched) {
        await syncChannelsForSite(strapi2, documentId, channelIds);
      }
      const savedSiteConfig = await service.getSiteConfig(documentId);
      const fullEc = savedSiteConfig?.extraConfig ?? {};
      const { extraConfig: _ec, _meta: _m, ...savedFields } = savedSiteConfig ?? {};
      const safeFullEc = {};
      for (const [key, value] of Object.entries(fullEc)) {
        if (!(key in savedFields)) {
          safeFullEc[key] = value;
        }
      }
      const data = {
        ...savedFields,
        ...safeFullEc,
        authMode: fullEc.authMode ?? "local",
        defaultChannelScope: fullEc.defaultChannelScope ?? "all",
        _meta: _m ?? null
      };
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message, deniedFields: error.deniedFields };
    }
  },
  async deleteSite(ctx) {
    try {
      const { documentId } = ctx.params;
      const siteConfigService = strapi2.plugin("zhao-common")?.service("site-config");
      if (!siteConfigService || typeof siteConfigService.deleteConfig !== "function") {
        ctx.status = 500;
        ctx.body = { error: "站点配置服务不可用" };
        return;
      }
      const data = await siteConfigService.deleteConfig(documentId);
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  // ========== 三方配置 ==========
  async getThird(ctx) {
    try {
      const service = strapi2.plugin("zhao-common").service("config");
      const filters = { ...ctx.query?.filters ?? {} };
      const siteFilter = buildThirdPartySiteFilter(strapi2, ctx);
      if (siteFilter) {
        filters.site = { ...filters.site ?? {}, ...siteFilter.site };
      }
      const data = await service.getThirdPartyConfigs(filters);
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async getThirdOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const service = strapi2.plugin("zhao-common").service("config");
      const data = await service.getThirdPartyConfig(documentId);
      if (!data) {
        ctx.status = 404;
        ctx.body = { error: "三方配置不存在" };
        return;
      }
      await assertThirdPartyInScope(strapi2, ctx, data);
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async createThird(ctx) {
    try {
      const { data: body } = ctx.request.body;
      const service = strapi2.plugin("zhao-common").service("config");
      if (body?.site) {
        const siteId = typeof body.site === "string" ? body.site : body.site?.documentId;
        if (siteId) {
          const site = await strapi2.documents("plugin::zhao-common.site-config").findOne({ documentId: siteId, populate: ["channels"] });
          if (site) {
            const svc = getChannelScopeService(strapi2);
            svc?.assertRecordInScope?.(ctx.state?.channelScope, site, "channels");
          }
        }
      }
      const data = await service.createThirdPartyConfig(body);
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async updateThird(ctx) {
    try {
      const { documentId } = ctx.params;
      const { data: body } = ctx.request.body;
      const service = strapi2.plugin("zhao-common").service("config");
      const existing = await service.getThirdPartyConfig(documentId);
      if (!existing) {
        ctx.status = 404;
        ctx.body = { error: "三方配置不存在" };
        return;
      }
      await assertThirdPartyInScope(strapi2, ctx, existing);
      const data = await service.updateThirdPartyConfig(documentId, body);
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async deleteThird(ctx) {
    try {
      const { documentId } = ctx.params;
      const service = strapi2.plugin("zhao-common").service("config");
      const existing = await service.getThirdPartyConfig(documentId);
      if (!existing) {
        ctx.status = 404;
        ctx.body = { error: "三方配置不存在" };
        return;
      }
      await assertThirdPartyInScope(strapi2, ctx, existing);
      const data = await service.deleteThirdPartyConfig(documentId);
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  // ========== 积分配置 ==========
  async getPoints(ctx) {
    try {
      const service = strapi2.plugin("zhao-common").service("config");
      const data = await service.getPointsConfig();
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async updatePoints(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi2.plugin("zhao-common").service("config");
      const data = await service.updatePointsConfig(body);
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  // ========== OSS配置 ==========
  async getOss(ctx) {
    try {
      const service = strapi2.plugin("zhao-common").service("config");
      const data = await service.getOssConfig();
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async updateOss(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi2.plugin("zhao-common").service("config");
      const data = await service.updateOssConfig(body);
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  // ========== SSO应用 ==========
  async getSso(ctx) {
    try {
      const service = strapi2.plugin("zhao-common").service("config");
      const data = await service.getSsoApps(ctx.query);
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async getSsoOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const service = strapi2.plugin("zhao-common").service("config");
      const data = await service.getSsoApp(documentId);
      if (!data) {
        ctx.status = 404;
        ctx.body = { error: "SSO应用不存在" };
        return;
      }
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async createSso(ctx) {
    try {
      const { data: body } = ctx.request.body;
      const service = strapi2.plugin("zhao-common").service("config");
      const data = await service.createSsoApp(body);
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async updateSso(ctx) {
    try {
      const { documentId } = ctx.params;
      const { data: body } = ctx.request.body;
      const service = strapi2.plugin("zhao-common").service("config");
      const data = await service.updateSsoApp(documentId, body);
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async deleteSso(ctx) {
    try {
      const { documentId } = ctx.params;
      const service = strapi2.plugin("zhao-common").service("config");
      const data = await service.deleteSsoApp(documentId);
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  // ========== 公开配置 ==========
  async getPublic(ctx) {
    try {
      const siteId = ctx.state?.siteId;
      const channelId = ctx.query.channel || ctx.state?.channelId;
      const service = strapi2.plugin("zhao-common").service("config");
      const data = await service.getPublicConfig(siteId, channelId);
      ctx.body = { data };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  // ========== 获取可用渠道（站点渠道 + 用户渠道） ==========
  async getAvailableChannels(ctx) {
    try {
      const siteId = ctx.state?.siteId;
      const userId = ctx.state?.user?.id;
      if (!siteId) {
        ctx.status = 400;
        ctx.body = { error: "缺少站点标识" };
        return;
      }
      const channels = await strapi2.plugin("zhao-common").service("site-config").getAvailableChannels(siteId, userId);
      ctx.body = {
        data: channels
      };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  }
});
const softDelete = ({ strapi: strapi2 }) => ({
  async softDelete(ctx) {
    try {
      const { contentType, documentId } = ctx.params;
      if (!contentType || !documentId) {
        ctx.status = 400;
        ctx.body = { error: "contentType and documentId are required" };
        return;
      }
      const result = await strapi2.plugin("zhao-common").service("soft-delete").softDelete(contentType, documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Record not found" };
        return;
      }
      ctx.status = 200;
      ctx.body = { data: result };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async restore(ctx) {
    try {
      const { contentType, documentId } = ctx.params;
      if (!contentType || !documentId) {
        ctx.status = 400;
        ctx.body = { error: "contentType and documentId are required" };
        return;
      }
      const result = await strapi2.plugin("zhao-common").service("soft-delete").restore(contentType, documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Record not found" };
        return;
      }
      ctx.status = 200;
      ctx.body = { data: result };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async findDeleted(ctx) {
    try {
      const { contentType } = ctx.params;
      if (!contentType) {
        ctx.status = 400;
        ctx.body = { error: "contentType is required" };
        return;
      }
      const { filters, pagination, sort } = ctx.query || {};
      const result = await strapi2.plugin("zhao-common").service("soft-delete").findDeleted(contentType, { filters, pagination, sort });
      ctx.status = 200;
      ctx.body = { data: result };
    } catch (error) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  }
});
const siteConfig = ({ strapi: strapi2 }) => ({
  async get(ctx) {
    try {
      const service = strapi2.plugin("zhao-common").service("site-config");
      const config2 = await service.getConfig();
      ctx.body = { data: config2 };
    } catch (e) {
      ctx.status = e.status ?? 400;
      ctx.body = { error: e.message };
    }
  },
  async update(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi2.plugin("zhao-common").service("site-config");
      const config2 = await service.updateConfig(body);
      ctx.body = { data: config2 };
    } catch (e) {
      ctx.status = e.status ?? 400;
      ctx.body = { error: e.message };
    }
  },
  async getPublic(ctx) {
    try {
      const service = strapi2.plugin("zhao-common").service("site-config");
      const config2 = await service.getPublicConfig();
      ctx.body = { data: config2 };
    } catch (e) {
      ctx.status = e.status ?? 400;
      ctx.body = { error: e.message };
    }
  }
});
const siteTemplate = ({ strapi: strapi2 }) => ({
  async list(ctx) {
    try {
      const service = strapi2.plugin("zhao-common").service("site-template");
      const data = await service.listTemplates(ctx.query);
      ctx.body = { data };
    } catch (error) {
      strapi2.log.error(`[zhao-common] 获取模板列表失败: ${error.message}`);
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async get(ctx) {
    try {
      const { documentId } = ctx.params;
      const service = strapi2.plugin("zhao-common").service("site-template");
      const data = await service.getTemplate(documentId);
      if (!data) {
        ctx.status = 404;
        ctx.body = { error: "模板不存在" };
        return;
      }
      ctx.body = { data };
    } catch (error) {
      strapi2.log.error(`[zhao-common] 获取模板失败: ${error.message}`);
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async create(ctx) {
    try {
      const body = ctx.request.body?.data ?? ctx.request.body;
      const service = strapi2.plugin("zhao-common").service("site-template");
      const data = await service.createTemplate(body);
      ctx.body = { data };
    } catch (error) {
      strapi2.log.error(`[zhao-common] 创建模板失败: ${error.message}`);
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data ?? ctx.request.body;
      const service = strapi2.plugin("zhao-common").service("site-template");
      const data = await service.updateTemplate(documentId, body);
      ctx.body = { data };
    } catch (error) {
      strapi2.log.error(`[zhao-common] 更新模板失败: ${error.message}`);
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      const service = strapi2.plugin("zhao-common").service("site-template");
      const data = await service.deleteTemplate(documentId);
      ctx.body = { data };
    } catch (error) {
      strapi2.log.error(`[zhao-common] 删除模板失败: ${error.message}`);
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
  async applyToSite(ctx) {
    try {
      const { templateDocumentId, mode } = ctx.request.body;
      const siteDocumentId = ctx.state?.siteId;
      if (!templateDocumentId || !siteDocumentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少模板或站点信息" };
        return;
      }
      if (mode && !["merge", "overwrite"].includes(mode)) {
        ctx.status = 400;
        ctx.body = { error: "mode 只支持 merge 或 overwrite" };
        return;
      }
      const service = strapi2.plugin("zhao-common").service("site-template");
      const data = await service.applyTemplateToSite(templateDocumentId, siteDocumentId, mode ?? "merge");
      ctx.body = { data };
    } catch (error) {
      strapi2.log.error(`[zhao-common] 应用模板失败: ${error.message}`);
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  }
});
const globalConfig = {
  async get(ctx) {
    const service = strapi.plugin("zhao-common").service("global-config");
    const data = await service.getGlobalConfig();
    ctx.body = { data };
  },
  async update(ctx) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { moduleEnabled, moduleTenantGrants, moduleVisibility } = body;
    if (moduleEnabled !== void 0) {
      if (typeof moduleEnabled !== "object" || Array.isArray(moduleEnabled)) {
        ctx.status = 400;
        ctx.body = { error: "moduleEnabled must be an object" };
        return;
      }
      for (const key of Object.keys(moduleEnabled)) {
        if (!VISIBILITY_MODULES.includes(key)) {
          strapi.log.warn(`[global-config] Unknown moduleKey ignored: ${key}`);
          delete moduleEnabled[key];
        }
      }
    }
    if (moduleTenantGrants !== void 0) {
      if (typeof moduleTenantGrants !== "object" || Array.isArray(moduleTenantGrants)) {
        ctx.status = 400;
        ctx.body = { error: "moduleTenantGrants must be an object" };
        return;
      }
      for (const [key, tenantIds] of Object.entries(moduleTenantGrants)) {
        if (!VISIBILITY_MODULES.includes(key)) continue;
        if (!Array.isArray(tenantIds)) {
          ctx.status = 400;
          ctx.body = { error: `moduleTenantGrants.${key} must be an array` };
          return;
        }
      }
    }
    if (moduleVisibility !== void 0) {
      if (typeof moduleVisibility !== "object" || Array.isArray(moduleVisibility)) {
        ctx.status = 400;
        ctx.body = { error: "moduleVisibility must be an object" };
        return;
      }
      for (const [key, roles] of Object.entries(moduleVisibility)) {
        if (!VISIBILITY_MODULES.includes(key)) {
          strapi.log.warn(`[global-config] Unknown moduleKey ignored: ${key}`);
          delete moduleVisibility[key];
          continue;
        }
        if (!Array.isArray(roles)) {
          ctx.status = 400;
          ctx.body = { error: `moduleVisibility.${key} must be an array` };
          return;
        }
      }
    }
    try {
      const service = strapi.plugin("zhao-common").service("global-config");
      const saved = await service.updateGlobalConfig({ moduleEnabled, moduleTenantGrants, moduleVisibility });
      try {
        strapi.plugin("zhao-auth")?.service("permission")?.invalidateCache?.();
      } catch {
      }
      ctx.body = { data: saved };
    } catch (e) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  }
};
const controllers = {
  config,
  "soft-delete": softDelete,
  "site-config": siteConfig,
  "site-template": siteTemplate,
  "global-config": globalConfig
};
const admin = {
  type: "admin",
  routes: []
};
const publicRoute = (method, path2, handler) => ({
  method,
  path: `/v1${path2}`,
  handler,
  config: { auth: false }
});
const adminRoute = (method, path2, handler, permission) => ({
  method,
  path: `/v1/admin${path2}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      // 非阻断：注入 ctx.state.channelScope 供控制器过滤
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-auth.has-tenant-access"
    ]
  }
});
const strictUserRoute = (method, path2, handler) => ({
  method,
  path: `/v1${path2}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-common.has-tenant-access-strict"
    ]
  }
});
const contentApi = () => ({
  type: "content-api",
  routes: [
    // ===== 公开路由 =====
    publicRoute("GET", "/public/config", "config.getPublic"),
    // ===== 管理端路由 =====
    adminRoute("POST", "/soft-delete/:contentType/:documentId", "soft-delete.softDelete", "soft-delete.manage"),
    adminRoute("POST", "/soft-delete/:contentType/:documentId/restore", "soft-delete.restore", "soft-delete.manage"),
    adminRoute("GET", "/soft-delete/:contentType/deleted", "soft-delete.findDeleted", "soft-delete.read"),
    // 统一配置路由
    adminRoute("GET", "/config/sites", "config.getSiteList", "config.read"),
    adminRoute("GET", "/config/site", "config.getSite", "config.read"),
    adminRoute("GET", "/config/site/:documentId", "config.getSiteOne", "config.read"),
    adminRoute("POST", "/config/site", "config.createSite", "config.create"),
    adminRoute("PUT", "/config/site", "config.updateSite", "config.update"),
    adminRoute("PUT", "/config/site/:documentId", "config.updateSiteById", "config.update"),
    adminRoute("DELETE", "/config/site/:documentId", "config.deleteSite", "config.delete"),
    adminRoute("GET", "/config/third", "config.getThird", "config.read"),
    adminRoute("GET", "/config/third/:documentId", "config.getThirdOne", "config.read"),
    adminRoute("POST", "/config/third", "config.createThird", "config.create"),
    adminRoute("PUT", "/config/third/:documentId", "config.updateThird", "config.update"),
    adminRoute("DELETE", "/config/third/:documentId", "config.deleteThird", "config.delete"),
    adminRoute("GET", "/config/points", "config.getPoints", "config.read"),
    adminRoute("PUT", "/config/points", "config.updatePoints", "config.update"),
    adminRoute("GET", "/config/oss", "config.getOss", "config.read"),
    adminRoute("PUT", "/config/oss", "config.updateOss", "config.update"),
    adminRoute("GET", "/config/sso", "config.getSso", "config.read"),
    adminRoute("GET", "/config/sso/:documentId", "config.getSsoOne", "config.read"),
    adminRoute("POST", "/config/sso", "config.createSso", "config.create"),
    adminRoute("PUT", "/config/sso/:documentId", "config.updateSso", "config.update"),
    adminRoute("DELETE", "/config/sso/:documentId", "config.deleteSso", "config.delete"),
    // 模板管理路由
    adminRoute("GET", "/templates", "site-template.list", "template.read"),
    adminRoute("GET", "/templates/:documentId", "site-template.get", "template.read"),
    adminRoute("POST", "/templates", "site-template.create", "template.create"),
    adminRoute("PUT", "/templates/:documentId", "site-template.update", "template.update"),
    adminRoute("DELETE", "/templates/:documentId", "site-template.delete", "template.delete"),
    adminRoute("POST", "/templates/apply", "site-template.applyToSite", "template.update"),
    // 获取可用渠道（站点渠道 + 用户直接渠道，不扩展子树）- strict 策略
    strictUserRoute("GET", "/channels/available", "config.getAvailableChannels"),
    // 全局配置路由
    adminRoute("GET", "/global-config", "global-config.get", "global-config.read"),
    adminRoute("PUT", "/global-config", "global-config.update", "global-config.update")
  ]
});
const routes = {
  admin,
  "content-api": contentApi
};
const index = {
  register,
  bootstrap,
  config: config$2,
  services,
  contentTypes,
  controllers,
  policies,
  routes
};
exports.default = index;
