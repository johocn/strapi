var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// plugins/zhao-common/server/src/policies/has-tenant-access-loose.ts
var hasTenantAccessLoose = async (policyContext, config, { strapi: strapi2 }) => {
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
    const siteConfig = await strapi2.db.query("plugin::zhao-common.site-config").findOne({
      where: { documentId: siteId },
      populate: { channels: { select: ["id"] } }
    });
    if (siteConfig?.channels && Array.isArray(siteConfig.channels)) {
      siteChannelIds = siteConfig.channels.map((c) => c?.id).filter((id) => typeof id === "number");
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
var has_tenant_access_loose_default = hasTenantAccessLoose;

// plugins/zhao-common/server/src/policies/has-tenant-access-strict.ts
var hasTenantAccessStrict = async (policyContext, config, { strapi: strapi2 }) => {
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
    const siteConfig = await strapi2.db.query("plugin::zhao-common.site-config").findOne({
      where: { documentId: siteId },
      populate: { channels: { select: ["id"] } }
    });
    if (siteConfig?.channels && Array.isArray(siteConfig.channels)) {
      siteChannelIds = siteConfig.channels.map((c) => c?.id).filter((id) => typeof id === "number");
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
var has_tenant_access_strict_default = hasTenantAccessStrict;

// plugins/zhao-common/server/src/policies/resolve-channel-scope.ts
var resolveChannelScope = async (policyContext, config, { strapi: strapi2 }) => {
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
    const siteConfig = await strapi2.db.query("plugin::zhao-common.site-config").findOne({
      where: { documentId: siteId },
      select: ["channelUsage"],
      populate: { channels: { select: ["id"] } }
    });
    if (siteConfig) {
      if (siteConfig.channelUsage) {
        channelUsage = siteConfig.channelUsage;
      }
      if (Array.isArray(siteConfig.channels)) {
        siteChannelIds = siteConfig.channels.map((c) => typeof c === "number" ? c : c?.id).filter((id) => typeof id === "number");
      }
    }
  } catch (e) {
    strapi2.log.warn(`[resolve-channel-scope] \u67E5\u8BE2 site-config \u5931\u8D25: ${e.message}`);
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
var resolve_channel_scope_default = resolveChannelScope;

// plugins/zhao-common/server/src/policies/index.ts
var policies_default = {
  "has-tenant-access-loose": has_tenant_access_loose_default,
  "has-tenant-access-strict": has_tenant_access_strict_default,
  "resolve-channel-scope": resolve_channel_scope_default
};

// plugins/zhao-common/server/src/register.ts
var register = ({ strapi: strapi2 }) => {
  const policyRegistry = strapi2.get("policies");
  policyRegistry.add("plugin::zhao-common", policies_default);
  strapi2.log.info("[zhao-common] \u7B56\u7565\u5DF2\u6CE8\u518C");
};
var register_default = register;

// plugins/zhao-common/server/src/middlewares/site-resolver.ts
var SITE_CONFIG_UID = "plugin::zhao-common.site-config";
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
var siteResolver = (config, { strapi: strapi2 }) => {
  return async (ctx, next) => {
    if (ctx.state?.siteId) {
      return await next();
    }
    const raw = typeof ctx.query?.domain === "string" && ctx.query.domain || typeof ctx.request?.header?.["x-site-domain"] === "string" && ctx.request.header["x-site-domain"] || ctx.request.header.host || "";
    const domain = extractHost(raw);
    try {
      if (domain) {
        const records = await strapi2.documents(SITE_CONFIG_UID).findMany({
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
var site_resolver_default = siteResolver;

// plugins/zhao-common/server/src/middlewares/tenant-context-resolver.ts
var SITE_CONFIG_UID2 = "plugin::zhao-common.site-config";
var tenantContextResolver = (config, { strapi: strapi2 }) => {
  return async (ctx, next) => {
    if (ctx.state?.siteId) {
      return await next();
    }
    const siteIdFromHeader = ctx.request?.headers?.["x-site-id"];
    const siteIdFromQuery = ctx.query?.siteId;
    const rawSiteId = siteIdFromHeader || siteIdFromQuery;
    if (rawSiteId) {
      try {
        const site = await strapi2.db.query(SITE_CONFIG_UID2).findOne({
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
var tenant_context_resolver_default = tenantContextResolver;

// plugins/zhao-common/server/src/bootstrap.ts
var SITE_CONFIG_UID3 = "plugin::zhao-common.site-config";
var TEMPLATE_UID = "plugin::zhao-common.site-template";
var DEFAULT_SITE_CONFIG = {
  siteName: "\u5723\u9E9F\u6559\u80B2",
  siteDescription: "\u8BA9\u5B66\u4E60\u66F4\u6709\u4EF7\u503C",
  seoKeywords: "\u6559\u80B2,\u5B66\u4E60,\u8BFE\u7A0B",
  seoDescription: "\u5723\u9E9F\u6559\u80B2\u5E73\u53F0",
  icpNumber: "",
  tencentMapKey: "",
  shareTitle: "\u5723\u9E9F\u6559\u80B2",
  shareDescription: "\u8BA9\u5B66\u4E60\u66F4\u6709\u4EF7\u503C",
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
var getSoftDeleteModels = (strapi2) => Object.keys(strapi2.contentTypes).filter(
  (uid) => uid.startsWith("plugin::zhao-") && "deletedAt" in strapi2.contentTypes[uid].attributes
);
var addDeletedAtFilter = (event) => {
  const { params } = event;
  if (!params) return;
  if (!params.where) {
    params.where = {};
  }
  if ("deletedAt" in params.where) return;
  params.where.deletedAt = null;
};
var bootstrap = async ({ strapi: strapi2 }) => {
  try {
    const migrationService = strapi2.plugin("zhao-common").service("migration-runner");
    if (migrationService && typeof migrationService.runAllMigrations === "function") {
      await migrationService.runAllMigrations();
    }
  } catch (err) {
    strapi2.log.error(`[zhao-common] \u6570\u636E\u5E93\u8FC1\u79FB\u6267\u884C\u5931\u8D25: ${err.message}`);
    throw err;
  }
  strapi2.server.use(async (ctx, next) => {
    if (ctx.path?.startsWith("/admin") || ctx.path?.startsWith("/content-manager") || ctx.path?.startsWith("/health")) {
      return next();
    }
    const middleware = tenant_context_resolver_default({}, { strapi: strapi2 });
    if (typeof middleware === "function") {
      return middleware(ctx, next);
    }
    return next();
  });
  strapi2.server.use(async (ctx, next) => {
    if (ctx.path?.startsWith("/admin") || ctx.path?.startsWith("/content-manager") || ctx.path?.startsWith("/health")) {
      return next();
    }
    const middleware = site_resolver_default({}, { strapi: strapi2 });
    if (typeof middleware === "function") {
      return middleware(ctx, next);
    }
    return next();
  });
  const existingConfig = await strapi2.documents(SITE_CONFIG_UID3).findMany();
  if (!existingConfig || Array.isArray(existingConfig) && existingConfig.length === 0) {
    let defaultTemplate = null;
    const existingTemplates = await strapi2.documents(TEMPLATE_UID).findMany({
      filters: { isDefault: true }
    });
    if (Array.isArray(existingTemplates) && existingTemplates.length > 0) {
      defaultTemplate = existingTemplates[0];
    } else {
      defaultTemplate = await strapi2.documents(TEMPLATE_UID).create({
        data: {
          name: "\u9ED8\u8BA4\u6A21\u677F",
          description: "\u7CFB\u7EDF\u9ED8\u8BA4\u914D\u7F6E\u6A21\u677F\uFF0C\u6240\u6709\u5B57\u6BB5\u5747\u53EF\u7F16\u8F91",
          presetConfig: DEFAULT_SITE_CONFIG.extraConfig,
          fieldConstraints: {},
          enabled: true,
          isDefault: true
        }
      });
      strapi2.log.info(`[zhao-common] \u9ED8\u8BA4\u6A21\u677F\u5DF2\u521D\u59CB\u5316`);
    }
    await strapi2.documents(SITE_CONFIG_UID3).create({
      data: {
        ...DEFAULT_SITE_CONFIG,
        extraConfig: {},
        // 差异存储：默认站点关联默认模板，无需重复存储预设值
        template: defaultTemplate?.documentId ?? null
      }
    });
    strapi2.log.info(`[zhao-common] \u7AD9\u70B9\u914D\u7F6E\u5DF2\u521D\u59CB\u5316`);
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
      `[zhao-common] soft-delete \u81EA\u52A8\u8FC7\u6EE4\u5DF2\u6CE8\u518C\uFF0C\u8986\u76D6 ${softDeleteModels.length} \u4E2A content-type`
    );
  }
  await initDefaultTemplates();
};
async function initDefaultTemplates() {
  const TEMPLATE_UID3 = "plugin::zhao-common.site-template";
  try {
    const existing = await strapi.db.query(TEMPLATE_UID3).count({ where: { name: "coursera-blue" } });
    if (existing > 0) return;
    const presets = [
      {
        name: "coursera-blue",
        displayName: "Coursera \u5B66\u672F\u84DD",
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
        displayName: "Khan \u5B66\u9662\u7EFF",
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
        displayName: "Udemy \u9C9C\u8273\u7D2B",
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
        displayName: "edX \u6DF1\u84DD\u5B66\u672F",
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
        displayName: "\u7F51\u6613\u8BFE\u5802\u7EA2",
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
      await strapi.db.query(TEMPLATE_UID3).create({ data: preset });
    }
    strapi.log.info(`[bootstrap] \u5DF2\u751F\u6210 ${presets.length} \u5957\u9884\u8BBE\u6A21\u677F`);
  } catch (e) {
    strapi.log.warn("[bootstrap] initDefaultTemplates failed:", e.message);
  }
}
var bootstrap_default = bootstrap;

// plugins/zhao-common/server/src/config/index.ts
var config_default = {
  default: {},
  validator() {
  }
};

// plugins/zhao-common/server/src/services/logger.ts
var logger_default = ({ strapi: strapi2 }) => ({
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

// plugins/zhao-common/server/src/utils/errors.ts
var AppError = class extends Error {
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
};

// plugins/zhao-common/server/src/utils/codes.ts
var ErrorCodes = {
  // ── 通用 (COMMON) ──
  UNKNOWN_ERROR: "COMMON_001",
  VALIDATION_ERROR: "COMMON_002",
  NOT_FOUND: "COMMON_003",
  FORBIDDEN: "COMMON_004",
  UNAUTHORIZED: "COMMON_005",
  CONFIG_ERROR: "COMMON_006",
  INTERNAL_ERROR: "COMMON_007",
  // ── 渠道 (CHANNEL) ──
  CHANNEL_NOT_FOUND: "CHANNEL_001",
  CHANNEL_DEPTH_EXCEEDED: "CHANNEL_002",
  CHANNEL_DISABLED: "CHANNEL_003",
  INVITE_CODE_INVALID: "CHANNEL_004",
  MEMBER_NOT_FOUND: "CHANNEL_005",
  CHANNEL_DUPLICATE: "CHANNEL_006",
  USER_NOT_LINKED: "CHANNEL_007",
  // ── 认证 (AUTH) ──
  TOKEN_MISSING: "AUTH_001",
  TOKEN_INVALID: "AUTH_002",
  ROLE_INSUFFICIENT: "AUTH_003",
  SCOPE_FORBIDDEN: "AUTH_004",
  RESOURCE_OWNER_MISMATCH: "AUTH_005"
};

// plugins/zhao-common/server/src/services/error-handler.ts
var error_handler_default = ({ strapi: _strapi }) => ({
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

// plugins/zhao-common/server/src/services/config-manager.ts
var config_manager_default = ({ strapi: strapi2 }) => ({
  get(key, defaultValue) {
    const pluginConfig = strapi2.plugin("zhao-common")?.config ?? {};
    return pluginConfig[key] ?? defaultValue;
  },
  getAll() {
    return strapi2.plugin("zhao-common")?.config ?? {};
  }
});

// plugins/zhao-common/server/src/services/i18n.ts
var MESSAGES = {
  // ── 通用 ──
  COMMON_001: "\u672A\u77E5\u9519\u8BEF",
  COMMON_002: "\u53C2\u6570\u6821\u9A8C\u5931\u8D25: {reason}",
  COMMON_003: "\u8D44\u6E90\u4E0D\u5B58\u5728: {resource}",
  COMMON_004: "\u65E0\u6743\u9650\u8BBF\u95EE",
  COMMON_005: "\u8BA4\u8BC1\u5931\u8D25",
  COMMON_006: "\u914D\u7F6E\u9519\u8BEF: {detail}",
  // ── 渠道 ──
  CHANNEL_001: "\u6E20\u9053\u4E0D\u5B58\u5728 (id={channelId})",
  CHANNEL_002: "\u6E20\u9053\u5C42\u7EA7\u6DF1\u5EA6\u8D85\u9650\uFF08\u6700\u5927 2 \u7EA7\uFF09",
  CHANNEL_003: "\u6E20\u9053\u5DF2\u88AB\u7981\u7528",
  CHANNEL_004: "\u9080\u8BF7\u7801\u4E0D\u5B58\u5728\u6216\u5DF2\u8FC7\u671F",
  CHANNEL_005: "\u6210\u5458\u4E0D\u5B58\u5728",
  CHANNEL_006: "\u6E20\u9053\u540D\u5DF2\u5B58\u5728: {name}",
  CHANNEL_007: "\u7528\u6237\u672A\u5173\u8054\u6E20\u9053",
  // ── 认证 ──
  AUTH_001: "\u7F3A\u5C11\u8BA4\u8BC1\u4EE4\u724C",
  AUTH_002: "\u4EE4\u724C\u65E0\u6548\u6216\u5DF2\u8FC7\u671F",
  AUTH_003: "\u89D2\u8272\u6743\u9650\u4E0D\u8DB3 (\u9700\u8981: {roles})",
  AUTH_004: "\u65E0\u6743\u8BBF\u95EE\u8BE5\u6E20\u9053",
  AUTH_005: "\u8D44\u6E90\u6240\u6709\u8005\u4E0D\u5339\u914D"
};
var i18n_default = ({ strapi: _strapi }) => {
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

// plugins/zhao-common/server/src/services/soft-delete.ts
var resolveUid = (contentType) => contentType.includes("::") ? contentType : `plugin::${contentType}`;
var SOFT_DELETE_WHITELIST = /* @__PURE__ */ new Set([
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
    const e = new Error(`contentType "${uid}" \u4E0D\u652F\u6301\u8F6F\u5220\u9664`);
    e.status = 400;
    throw e;
  }
}
var soft_delete_default = ({ strapi: strapi2 }) => ({
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
  async findDeleted(contentType, options = {}) {
    const uid = resolveUid(contentType);
    assertWhitelisted(uid);
    const model = strapi2.contentType(uid);
    if (!model) {
      strapi2.log.warn(`[zhao-common] findDeleted: contentType "${uid}" not found`);
      return [];
    }
    const query = {
      where: { ...options.filters && typeof options.filters === "object" && !Array.isArray(options.filters) ? options.filters : {}, deletedAt: { $ne: null } }
    };
    if (options.sort && typeof options.sort === "string") query.orderBy = options.sort;
    if (options.pagination) {
      const pageSize = options.pagination.pageSize ?? 25;
      query.limit = Math.min(Math.max(1, pageSize), 100);
      const page = Math.max(1, options.pagination.page ?? 1);
      query.offset = (page - 1) * query.limit;
    }
    const results = await strapi2.db.query(uid).findMany(query);
    const total = await strapi2.db.query(uid).count({ where: query.where });
    return {
      results: results ?? [],
      pagination: {
        total,
        page: Math.max(1, options.pagination.page ?? 1),
        pageSize: query.limit,
        pageCount: Math.ceil(total / query.limit)
      }
    };
  }
});

// plugins/zhao-common/server/src/services/site-config.ts
var UID = "plugin::zhao-common.site-config";
var DEFAULT_CONFIG = {
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
var PUBLIC_FIELDS = [
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
var site_config_default = ({ strapi: strapi2 }) => ({
  /**
   * 获取站点配置，支持按 documentId 查询
   * 多租户安全：siteId 为空时不兜底，返回空配置，避免泄露其他租户数据
   */
  async getConfig(siteId) {
    if (siteId) {
      const record = await strapi2.documents(UID).findOne({ documentId: siteId, populate: ["channels", "template", "logo", "favicon", "shareImage"] });
      if (record) return record;
    }
    return { ...DEFAULT_CONFIG };
  },
  /**
   * 按 domain 查询站点配置
   */
  async getConfigByDomain(domain) {
    const records = await strapi2.documents(UID).findMany({
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
    const records = await strapi2.documents(UID).findMany({ filters });
    if (Array.isArray(records)) {
      for (const record of records) {
        if (record.documentId !== excludeDocumentId) {
          const e = new Error(`\u57DF\u540D "${domain}" \u5DF2\u88AB\u5176\u4ED6\u7AD9\u70B9\u5360\u7528`);
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
    return strapi2.documents(UID).update({ documentId, data });
  },
  /**
   * 创建站点配置
   */
  async createConfig(data) {
    if (data.domain !== void 0) {
      await this._validateDomainUnique(data.domain);
    }
    return strapi2.documents(UID).create({ data });
  },
  async deleteConfig(documentId) {
    return strapi2.documents(UID).delete({ documentId });
  },
  /**
   * 获取公开配置（不含敏感字段）
   * @deprecated 使用 config 服务的 getPublicConfig（支持模板合并）
   */
  async getPublicConfig(siteId) {
    const config = await this.getConfig(siteId);
    const result = {};
    for (const key of PUBLIC_FIELDS) {
      result[key] = config[key] ?? DEFAULT_CONFIG[key];
    }
    if (config.logo) result.logo = config.logo;
    if (config.favicon) result.favicon = config.favicon;
    if (config.shareImage) result.shareImage = config.shareImage;
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
      const siteConfig = await this.getConfig(siteId);
      if (siteConfig?.channels && Array.isArray(siteConfig.channels)) {
        for (const ch of siteConfig.channels) {
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

// plugins/zhao-common/server/src/services/site-template.ts
var TEMPLATE_UID2 = "plugin::zhao-common.site-template";
var SITE_CONFIG_UID4 = "plugin::zhao-common.site-config";
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
var site_template_default = ({ strapi: strapi2 }) => ({
  /**
   * 列出模板
   */
  async listTemplates(filters = {}) {
    const { pageSize, page, sort, ...safeFilters } = filters;
    return strapi2.documents(TEMPLATE_UID2).findMany({ filters: safeFilters, populate: { sites: { fields: ["documentId"] } } });
  },
  /**
   * 获取模板
   */
  async getTemplate(documentId) {
    return strapi2.documents(TEMPLATE_UID2).findOne({ documentId, populate: { sites: { fields: ["documentId"] } } });
  },
  /**
   * 创建模板
   */
  async createTemplate(data) {
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      const e = new Error("\u6A21\u677F\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
      e.status = 400;
      throw e;
    }
    if (data.presetConfig !== void 0 && (typeof data.presetConfig !== "object" || data.presetConfig === null || Array.isArray(data.presetConfig))) {
      const e = new Error("presetConfig \u5FC5\u987B\u662F JSON \u5BF9\u8C61");
      e.status = 400;
      throw e;
    }
    if (data.fieldConstraints !== void 0 && (typeof data.fieldConstraints !== "object" || data.fieldConstraints === null || Array.isArray(data.fieldConstraints))) {
      const e = new Error("fieldConstraints \u5FC5\u987B\u662F JSON \u5BF9\u8C61");
      e.status = 400;
      throw e;
    }
    if (data.isDefault) {
      await this._clearDefaultFlag();
    }
    return strapi2.documents(TEMPLATE_UID2).create({ data });
  },
  /**
   * 更新模板
   */
  async updateTemplate(documentId, data) {
    if (data.name !== void 0 && (typeof data.name !== "string" || !data.name.trim())) {
      const e = new Error("\u6A21\u677F\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
      e.status = 400;
      throw e;
    }
    if (data.presetConfig !== void 0 && (typeof data.presetConfig !== "object" || data.presetConfig === null || Array.isArray(data.presetConfig))) {
      const e = new Error("presetConfig \u5FC5\u987B\u662F JSON \u5BF9\u8C61");
      e.status = 400;
      throw e;
    }
    if (data.fieldConstraints !== void 0 && (typeof data.fieldConstraints !== "object" || data.fieldConstraints === null || Array.isArray(data.fieldConstraints))) {
      const e = new Error("fieldConstraints \u5FC5\u987B\u662F JSON \u5BF9\u8C61");
      e.status = 400;
      throw e;
    }
    if (data.isDefault) {
      await this._clearDefaultFlag(documentId);
    }
    return strapi2.documents(TEMPLATE_UID2).update({ documentId, data });
  },
  /**
   * 删除模板
   * 先清除关联站点的 template 引用，再删除模板
   */
  async deleteTemplate(documentId) {
    const template = await this.getTemplate(documentId);
    if (!template) {
      const e = new Error("\u6A21\u677F\u4E0D\u5B58\u5728");
      e.status = 404;
      throw e;
    }
    if (template.isDefault) {
      const e = new Error("\u9ED8\u8BA4\u6A21\u677F\u4E0D\u53EF\u5220\u9664\uFF0C\u8BF7\u5148\u5C06\u5176\u4ED6\u6A21\u677F\u8BBE\u4E3A\u9ED8\u8BA4");
      e.status = 400;
      throw e;
    }
    const presetConfig = template.presetConfig && typeof template.presetConfig === "object" && !Array.isArray(template.presetConfig) ? template.presetConfig : {};
    const linkedSites = await strapi2.documents(SITE_CONFIG_UID4).findMany({
      filters: { template: documentId }
    });
    if (Array.isArray(linkedSites)) {
      for (const site of linkedSites) {
        const safeExtra = site.extraConfig && typeof site.extraConfig === "object" && !Array.isArray(site.extraConfig) ? site.extraConfig : {};
        const extraConfig = { ...presetConfig, ...safeExtra };
        await strapi2.documents(SITE_CONFIG_UID4).update({
          documentId: site.documentId,
          data: { template: null, extraConfig }
        });
      }
    }
    return strapi2.documents(TEMPLATE_UID2).delete({ documentId });
  },
  /**
   * 获取默认模板
   */
  async getDefaultTemplate() {
    const records = await strapi2.documents(TEMPLATE_UID2).findMany({
      filters: { isDefault: true, enabled: true }
    });
    if (Array.isArray(records) && records.length > 0) {
      return records[0];
    }
    const allRecords = await strapi2.documents(TEMPLATE_UID2).findMany({
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
      const e = new Error("\u6A21\u677F\u4E0D\u5B58\u5728");
      e.status = 404;
      throw e;
    }
    if (template.enabled === false) {
      const e = new Error("\u6A21\u677F\u5DF2\u7981\u7528\uFF0C\u65E0\u6CD5\u5E94\u7528");
      e.status = 400;
      throw e;
    }
    let extraConfig;
    const currentSite = await strapi2.documents(SITE_CONFIG_UID4).findOne({
      documentId: siteDocumentId,
      populate: ["template"]
    });
    if (!currentSite) {
      const e = new Error("\u7AD9\u70B9\u4E0D\u5B58\u5728");
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
    await strapi2.documents(SITE_CONFIG_UID4).update({
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
  async getMergedConfig(siteConfig) {
    if (!siteConfig) {
      return { config: {}, meta: null };
    }
    const templateId = siteConfig.template?.documentId ?? siteConfig.template;
    let template = null;
    if (templateId) {
      template = await this.getTemplate(templateId);
    }
    const tenantEc = parseExtraConfig(siteConfig.extraConfig);
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
    const siteConfig = await siteConfigService.getConfig(siteId);
    if (!siteConfig) {
      return { valid: true };
    }
    const templateId = siteConfig.template?.documentId ?? siteConfig.template;
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
        message: `\u4EE5\u4E0B\u5B57\u6BB5\u53D7\u6A21\u677F\u7EA6\u675F\u4E0D\u53EF\u4FEE\u6539: ${deniedFields.join(", ")}`
      };
    }
    return { valid: true };
  },
  /**
   * 清除其他模板的 isDefault 标记（确保唯一性）
   * @param excludeDocumentId 排除的模板ID（更新时排除自身）
   */
  async _clearDefaultFlag(excludeDocumentId) {
    const defaults = await strapi2.documents(TEMPLATE_UID2).findMany({
      filters: { isDefault: true }
    });
    if (Array.isArray(defaults)) {
      for (const tpl of defaults) {
        if (tpl.documentId !== excludeDocumentId) {
          await strapi2.documents(TEMPLATE_UID2).update({
            documentId: tpl.documentId,
            data: { isDefault: false }
          });
        }
      }
    }
  }
});

// plugins/zhao-auth/server/src/constants/module-visibility.ts
var VISIBILITY_MODULES = [
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

// plugins/zhao-common/server/src/services/config.ts
var config_default2 = ({ strapi: strapi2 }) => ({
  // ========== 站点配置 ==========
  async getSiteConfig(siteId) {
    try {
      const service = strapi2.plugin("zhao-common")?.service("site-config");
      if (service && typeof service.getConfig === "function") {
        const siteConfig = await service.getConfig(siteId);
        if (siteConfig) {
          const templateService = strapi2.plugin("zhao-common")?.service("site-template");
          if (templateService && typeof templateService.getMergedConfig === "function") {
            const { config, meta } = await templateService.getMergedConfig(siteConfig);
            return {
              ...siteConfig,
              extraConfig: config,
              _meta: meta
            };
          }
        }
        return siteConfig;
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
    const e = new Error("OSS\u914D\u7F6E\u66F4\u65B0\u529F\u80FD\u672A\u5B9E\u73B0");
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
        const { config } = await templateService.getMergedConfig(fullConfig);
        ec = config ?? {};
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
        const globalConfig = await globalConfigService?.getGlobalConfig();
        moduleEnabled = globalConfig?.moduleEnabled ?? {};
        moduleTenantGrants = globalConfig?.moduleTenantGrants ?? {};
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

// plugins/zhao-common/server/src/services/migration-runner.ts
import fs from "fs";
import path from "path";
var MIGRATION_TABLE = "zhao_schema_migrations";
var PLUGIN_ORDER = [
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
    const pluginMain = __require.resolve(`${plugin}/strapi-server.js`, { paths: [process.cwd()] });
    return path.dirname(path.dirname(pluginMain));
  } catch {
    try {
      const currentFile = typeof __filename !== "undefined" ? __filename : module.filename;
      const migrationRunnerDir = path.dirname(String(currentFile));
      const serverDir = path.dirname(migrationRunnerDir);
      const pluginDir = path.dirname(serverDir);
      const pluginsDir = path.dirname(pluginDir);
      const targetPlugin = path.join(pluginsDir, plugin);
      if (fs.existsSync(targetPlugin)) {
        return targetPlugin;
      }
    } catch (e) {
    }
    return "";
  }
}
var migration_runner_default = ({ strapi: strapi2 }) => ({
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
      strapi2.log.info("[migration] \u8FC1\u79FB\u8BB0\u5F55\u8868\u5DF2\u521B\u5EFA");
    }
  },
  async getExecutedMigrations(plugin) {
    const rows = await strapi2.db.connection(MIGRATION_TABLE).where({ plugin }).select("version");
    return rows.map((r) => r.version);
  },
  async getMigrationFiles(plugin) {
    const pluginRoot = getPluginRoot(plugin);
    const migrationsDir = path.join(pluginRoot, "server", "database", "migrations");
    if (!fs.existsSync(migrationsDir)) {
      return [];
    }
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".js") || f.endsWith(".ts")).sort();
    const result = [];
    for (const file of files) {
      const match = file.match(/^(\d+)_(.+)\.(js|ts)$/);
      if (match) {
        result.push({
          version: match[1],
          name: match[2],
          filePath: path.join(migrationsDir, file)
        });
      }
    }
    return result;
  },
  async runMigration(plugin, version, name, filePath, direction = "up") {
    const migration = __require(filePath);
    const fn = migration[direction];
    if (!fn) {
      if (direction === "down") return;
      throw new Error(`\u8FC1\u79FB\u811A\u672C ${filePath} \u7F3A\u5C11 ${direction} \u65B9\u6CD5`);
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
          strapi2.log.error(`[migration] ${plugin}: v${file.version} ${file.name} \u6267\u884C\u5931\u8D25: ${err.message}`);
          throw err;
        }
      }
    }
    if (executedCount > 0) {
      strapi2.log.info(`[migration] \u6570\u636E\u5E93\u8FC1\u79FB\u5B8C\u6210\uFF0C\u5171\u6267\u884C ${executedCount} \u4E2A`);
    }
  },
  async rollback(plugin, version) {
    await this.ensureMigrationTable();
    const files = await this.getMigrationFiles(plugin);
    const target = files.find((f) => f.version === version);
    if (!target) {
      throw new Error(`\u672A\u627E\u5230\u8FC1\u79FB\u811A\u672C: ${plugin} v${version}`);
    }
    const executed = await this.getExecutedMigrations(plugin);
    if (!executed.includes(version)) {
      throw new Error(`\u8FC1\u79FB\u672A\u6267\u884C\uFF0C\u65E0\u6CD5\u56DE\u6EDA: ${plugin} v${version}`);
    }
    await this.runMigration(plugin, version, target.name, target.filePath, "down");
    strapi2.log.info(`[migration] ${plugin}: v${version} \u56DE\u6EDA\u6210\u529F`);
  }
});

// plugins/zhao-common/server/src/services/global-config.ts
var UID2 = "plugin::zhao-common.global-config";
var global_config_default = ({ strapi: strapi2 }) => ({
  async getGlobalConfig() {
    try {
      const result = await strapi2.documents(UID2).findFirst({});
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
      return await strapi2.documents(UID2).update({ documentId, data: updateData });
    } else {
      return await strapi2.documents(UID2).create({ data: updateData });
    }
  }
});

// plugins/zhao-common/server/src/services/index.ts
var services_default = {
  logger: logger_default,
  "error-handler": error_handler_default,
  "config-manager": config_manager_default,
  i18n: i18n_default,
  "soft-delete": soft_delete_default,
  "site-config": site_config_default,
  "site-template": site_template_default,
  config: config_default2,
  "migration-runner": migration_runner_default,
  "global-config": global_config_default
};

// plugins/zhao-common/server/src/content-types/site-config/schema.json
var schema_default = {
  kind: "collectionType",
  collectionName: "zhao_site_configs",
  info: {
    singularName: "site-config",
    pluralName: "site-configs",
    displayName: "\u7AD9\u70B9\u914D\u7F6E",
    description: "\u7AD9\u70B9\u901A\u7528\u914D\u7F6E\uFF08\u591A\u79DF\u6237\uFF09"
  },
  options: {
    draftAndPublish: false
  },
  attributes: {
    siteName: {
      type: "string",
      maxLength: 100
    },
    siteDescription: {
      type: "text"
    },
    logo: {
      type: "media",
      multiple: false,
      required: false,
      allowedTypes: ["images"]
    },
    favicon: {
      type: "media",
      multiple: false,
      required: false,
      allowedTypes: ["images"]
    },
    icpNumber: {
      type: "string",
      maxLength: 50
    },
    seoKeywords: {
      type: "string",
      maxLength: 500
    },
    seoDescription: {
      type: "text"
    },
    tencentMapKey: {
      type: "string",
      maxLength: 64
    },
    shareTitle: {
      type: "string",
      maxLength: 100
    },
    shareDescription: {
      type: "string",
      maxLength: 200
    },
    shareImage: {
      type: "media",
      multiple: false,
      required: false,
      allowedTypes: ["images"]
    },
    customerServiceUrl: {
      type: "string",
      maxLength: 500
    },
    domain: {
      type: "string",
      maxLength: 255,
      unique: true
    },
    channels: {
      type: "relation",
      relation: "manyToMany",
      target: "plugin::zhao-channel.channel",
      mappedBy: "sites"
    },
    featureFlags: {
      type: "json",
      default: {
        sso: false,
        points: true,
        quiz: true,
        course: true,
        channel: true,
        thirdParty: true,
        oss: false,
        website: true,
        logistics: true,
        studio: true
      }
    },
    moduleVisibility: {
      type: "json",
      default: {}
    },
    template: {
      type: "relation",
      relation: "manyToOne",
      target: "plugin::zhao-common.site-template",
      inversedBy: "sites"
    },
    extraConfig: {
      type: "json"
    },
    themeConfig: {
      type: "json",
      default: "{}"
    },
    channelUsage: {
      type: "enumeration",
      enum: ["site_only", "site_and_cross", "site_cross_user"],
      default: "site_cross_user",
      required: true
    },
    tags: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-tag.tag",
      mappedBy: "site"
    },
    tagGroups: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-tag.tag-group",
      mappedBy: "site"
    },
    website_seo_config: {
      type: "relation",
      relation: "oneToOne",
      target: "plugin::zhao-website.seo-config",
      mappedBy: "site"
    },
    website_brand_info: {
      type: "relation",
      relation: "oneToOne",
      target: "plugin::zhao-website.brand-info",
      mappedBy: "site"
    },
    website_articles: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.article",
      mappedBy: "site"
    },
    website_article_categories: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.article-category",
      mappedBy: "site"
    },
    website_cases: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.case",
      mappedBy: "site"
    },
    website_faqs: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.faq",
      mappedBy: "site"
    },
    website_tutorials: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.tutorial",
      mappedBy: "site"
    },
    website_compliances: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.compliance",
      mappedBy: "site"
    },
    website_downloads: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.download",
      mappedBy: "site"
    },
    website_ai_summaries: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.ai-content-summary",
      mappedBy: "site"
    },
    website_first_truths: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.first-truth-policy",
      mappedBy: "site"
    },
    website_knowledge_entities: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.knowledge-entity",
      mappedBy: "site"
    },
    website_knowledge_relations: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.knowledge-relation",
      mappedBy: "site"
    },
    website_leads: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.lead",
      mappedBy: "site"
    },
    website_interactions: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.interaction",
      mappedBy: "site"
    },
    website_search_logs: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.search-log",
      mappedBy: "site"
    },
    website_visit_logs: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.visit-log",
      mappedBy: "site"
    },
    website_products: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.product",
      mappedBy: "site"
    },
    logistics_tracking_providers: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.tracking-provider",
      mappedBy: "site"
    },
    logistics_tracking_shipments: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.tracking-shipment",
      mappedBy: "site"
    },
    logistics_tracking_nodes: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.tracking-node",
      mappedBy: "site"
    },
    logistics_subscriptions: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.subscription",
      mappedBy: "site"
    },
    logistics_quote_requests: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.quote-request",
      mappedBy: "site"
    },
    logistics_quote_price_rules: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.quote-price-rule",
      mappedBy: "site"
    },
    logistics_quote_price_formulas: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.quote-price-formula",
      mappedBy: "site"
    },
    logistics_quote_field_rules: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.quote-field-rule",
      mappedBy: "site"
    },
    logistics_customer_profiles: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.customer-profile",
      mappedBy: "site"
    },
    logistics_conversion_events: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.conversion-event",
      mappedBy: "site"
    },
    logistics_conversion_funnels: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.conversion-funnel",
      mappedBy: "site"
    },
    logistics_contact_matrices: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.contact-matrix",
      mappedBy: "site"
    },
    logistics_landing_pages: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.landing-page",
      mappedBy: "site"
    },
    logistics_intent_orders: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.intent-order",
      mappedBy: "site"
    },
    logistics_referrals: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.referral",
      mappedBy: "site"
    },
    logistics_reviews: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-logistics.review",
      mappedBy: "site"
    },
    studio_sync_events: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-studio.sync-event",
      mappedBy: "site"
    },
    website_brand_voices: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-website.brand-voice",
      mappedBy: "site"
    }
  }
};

// plugins/zhao-common/server/src/content-types/site-template/schema.json
var schema_default2 = {
  kind: "collectionType",
  collectionName: "zhao_site_templates",
  info: {
    singularName: "site-template",
    pluralName: "site-templates",
    displayName: "\u7AD9\u70B9\u6A21\u677F",
    description: "\u79DF\u6237\u914D\u7F6E\u6A21\u677F\uFF0C\u5B9A\u4E49\u9884\u8BBE\u503C\u548C\u5B57\u6BB5\u7EA6\u675F"
  },
  options: {
    draftAndPublish: false
  },
  attributes: {
    name: {
      type: "string",
      required: true,
      maxLength: 100
    },
    displayName: {
      type: "string",
      maxLength: 100
    },
    description: {
      type: "text"
    },
    presetConfig: {
      type: "json",
      required: true
    },
    fieldConstraints: {
      type: "json",
      required: true
    },
    enabled: {
      type: "boolean",
      default: true
    },
    isDefault: {
      type: "boolean",
      default: false
    },
    sites: {
      type: "relation",
      relation: "oneToMany",
      target: "plugin::zhao-common.site-config",
      mappedBy: "template"
    },
    themeConfig: {
      type: "json",
      default: "{}"
    }
  }
};

// plugins/zhao-common/server/src/content-types/global-config/schema.json
var schema_default3 = {
  kind: "collectionType",
  collectionName: "zhao_global_configs",
  info: {
    singularName: "global-config",
    pluralName: "global-configs",
    displayName: "\u5168\u5C40\u914D\u7F6E",
    description: "\u8DE8\u79DF\u6237\u7684\u5168\u5C40\u6A21\u5757\u5F00\u5173\uFF0C\u4F18\u5148\u7EA7\u6700\u9AD8\uFF0C\u4EC5 admin \u53EF\u6539"
  },
  options: {
    draftAndPublish: false
  },
  attributes: {
    moduleEnabled: {
      type: "json",
      default: {
        website: false,
        logistics: false,
        studio: false,
        points: true,
        course: true,
        quiz: true,
        channel: true,
        sso: false,
        thirdParty: false,
        oss: false,
        payment: false,
        community: false,
        forum: false
      }
    },
    moduleTenantGrants: {
      type: "json",
      default: {}
    },
    moduleVisibility: {
      type: "json",
      default: {}
    }
  }
};

// plugins/zhao-common/server/src/content-types/index.ts
var content_types_default = {
  "site-config": { schema: schema_default },
  "site-template": { schema: schema_default2 },
  "global-config": { schema: schema_default3 }
};

// plugins/zhao-common/server/src/controllers/config.ts
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
    const e = new Error("\u8BF7\u9009\u62E9\u81F3\u5C11\u4E00\u4E2A\u6E20\u9053");
    e.status = 400;
    throw e;
  }
  const allowedIds = Array.isArray(scope.channelIds) ? scope.channelIds : [];
  if (allowedIds.length === 0) {
    const e = new Error("\u60A8\u6CA1\u6709\u4EFB\u4F55\u6E20\u9053\u6743\u9650\uFF0C\u65E0\u6CD5\u521B\u5EFA\u79DF\u6237");
    e.status = 400;
    throw e;
  }
  const selected = await strapi2.db.query("plugin::zhao-channel.channel").findMany({
    where: { documentId: { $in: channelDocumentIds } },
    select: ["id", "documentId", "name"]
  });
  const invalid = selected.find((ch) => !allowedIds.includes(ch.id));
  if (invalid) {
    const e = new Error(`\u65E0\u6743\u64CD\u4F5C\u6E20\u9053 ${invalid.name || invalid.documentId}`);
    e.status = 400;
    throw e;
  }
}
async function syncChannelsForSite(strapi2, siteConfigDocumentId, channelDocumentIds) {
  const siteConfig = await strapi2.db.query("plugin::zhao-common.site-config").findOne({
    where: { documentId: siteConfigDocumentId },
    select: ["id"]
  });
  if (!siteConfig) return;
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
    await trx("zhao_channels_sites_lnk").where("site_config_id", siteConfig.id).del();
    if (channelIds.length > 0) {
      const rows = channelIds.map((cid) => ({ channel_id: cid, site_config_id: siteConfig.id }));
      await trx("zhao_channels_sites_lnk").insert(rows);
    }
  });
}
var config_default3 = ({ strapi: strapi2 }) => ({
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
        ctx.body = { error: "\u7F3A\u5C11\u7AD9\u70B9\u6807\u8BC6" };
        return;
      }
      const service = strapi2.plugin("zhao-common").service("config");
      const siteConfig = await service.getSiteConfig(siteId);
      if (!siteConfig) {
        ctx.status = 404;
        ctx.body = { error: "\u7AD9\u70B9\u914D\u7F6E\u4E0D\u5B58\u5728" };
        return;
      }
      const ec = siteConfig.extraConfig ?? {};
      const { extraConfig, _meta, ...siteFields } = siteConfig;
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
      const siteConfig = await service.getSiteConfig(documentId);
      if (!siteConfig) {
        ctx.status = 404;
        ctx.body = { error: "\u7AD9\u70B9\u914D\u7F6E\u4E0D\u5B58\u5728" };
        return;
      }
      const ec = siteConfig.extraConfig ?? {};
      const { extraConfig, _meta, ...siteFields } = siteConfig;
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
        ctx.body = { error: "\u7AD9\u70B9\u914D\u7F6E\u670D\u52A1\u4E0D\u53EF\u7528" };
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
        ctx.body = { error: "\u521B\u5EFA\u7AD9\u70B9\u914D\u7F6E\u5931\u8D25" };
        return;
      }
      if (saved?.documentId) {
        await syncChannelsForSite(strapi2, saved.documentId, channelIds);
      }
      if (!saved) {
        ctx.status = 500;
        ctx.body = { error: "\u521B\u5EFA\u7AD9\u70B9\u914D\u7F6E\u5931\u8D25" };
        return;
      }
      const configService = strapi2.plugin("zhao-common").service("config");
      const siteConfig = await configService.getSiteConfig(saved.documentId);
      const ec = siteConfig?.extraConfig ?? {};
      const { extraConfig, _meta, ...siteFields } = siteConfig ?? {};
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
        ctx.body = { error: "\u7F3A\u5C11\u7AD9\u70B9\u6807\u8BC6" };
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
        ctx.body = { error: "\u7AD9\u70B9\u914D\u7F6E\u4E0D\u5B58\u5728" };
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
          strapi2.log.warn(`[config] \u66F4\u65B0\u6E20\u9053\u5173\u8054\u5931\u8D25: ${e.message}`);
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
        ctx.body = { error: "\u7AD9\u70B9\u914D\u7F6E\u4E0D\u5B58\u5728" };
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
        ctx.body = { error: "\u7AD9\u70B9\u914D\u7F6E\u670D\u52A1\u4E0D\u53EF\u7528" };
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
        ctx.body = { error: "\u4E09\u65B9\u914D\u7F6E\u4E0D\u5B58\u5728" };
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
        ctx.body = { error: "\u4E09\u65B9\u914D\u7F6E\u4E0D\u5B58\u5728" };
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
        ctx.body = { error: "\u4E09\u65B9\u914D\u7F6E\u4E0D\u5B58\u5728" };
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
        ctx.body = { error: "SSO\u5E94\u7528\u4E0D\u5B58\u5728" };
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
        ctx.body = { error: "\u7F3A\u5C11\u7AD9\u70B9\u6807\u8BC6" };
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

// plugins/zhao-common/server/src/controllers/soft-delete.ts
var soft_delete_default2 = ({ strapi: strapi2 }) => ({
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

// plugins/zhao-common/server/src/controllers/site-config.ts
var site_config_default2 = ({ strapi: strapi2 }) => ({
  async get(ctx) {
    try {
      const service = strapi2.plugin("zhao-common").service("site-config");
      const config = await service.getConfig();
      ctx.body = { data: config };
    } catch (e) {
      ctx.status = e.status ?? 400;
      ctx.body = { error: e.message };
    }
  },
  async update(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi2.plugin("zhao-common").service("site-config");
      const config = await service.updateConfig(body);
      ctx.body = { data: config };
    } catch (e) {
      ctx.status = e.status ?? 400;
      ctx.body = { error: e.message };
    }
  },
  async getPublic(ctx) {
    try {
      const service = strapi2.plugin("zhao-common").service("site-config");
      const config = await service.getPublicConfig();
      ctx.body = { data: config };
    } catch (e) {
      ctx.status = e.status ?? 400;
      ctx.body = { error: e.message };
    }
  }
});

// plugins/zhao-common/server/src/controllers/site-template.ts
var site_template_default2 = ({ strapi: strapi2 }) => ({
  async list(ctx) {
    try {
      const service = strapi2.plugin("zhao-common").service("site-template");
      const data = await service.listTemplates(ctx.query);
      ctx.body = { data };
    } catch (error) {
      strapi2.log.error(`[zhao-common] \u83B7\u53D6\u6A21\u677F\u5217\u8868\u5931\u8D25: ${error.message}`);
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
        ctx.body = { error: "\u6A21\u677F\u4E0D\u5B58\u5728" };
        return;
      }
      ctx.body = { data };
    } catch (error) {
      strapi2.log.error(`[zhao-common] \u83B7\u53D6\u6A21\u677F\u5931\u8D25: ${error.message}`);
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
      strapi2.log.error(`[zhao-common] \u521B\u5EFA\u6A21\u677F\u5931\u8D25: ${error.message}`);
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
      strapi2.log.error(`[zhao-common] \u66F4\u65B0\u6A21\u677F\u5931\u8D25: ${error.message}`);
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
      strapi2.log.error(`[zhao-common] \u5220\u9664\u6A21\u677F\u5931\u8D25: ${error.message}`);
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
        ctx.body = { error: "\u7F3A\u5C11\u6A21\u677F\u6216\u7AD9\u70B9\u4FE1\u606F" };
        return;
      }
      if (mode && !["merge", "overwrite"].includes(mode)) {
        ctx.status = 400;
        ctx.body = { error: "mode \u53EA\u652F\u6301 merge \u6216 overwrite" };
        return;
      }
      const service = strapi2.plugin("zhao-common").service("site-template");
      const data = await service.applyTemplateToSite(templateDocumentId, siteDocumentId, mode ?? "merge");
      ctx.body = { data };
    } catch (error) {
      strapi2.log.error(`[zhao-common] \u5E94\u7528\u6A21\u677F\u5931\u8D25: ${error.message}`);
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  }
});

// plugins/zhao-common/server/src/controllers/global-config.ts
var global_config_default2 = {
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

// plugins/zhao-common/server/src/controllers/index.ts
var controllers_default = {
  config: config_default3,
  "soft-delete": soft_delete_default2,
  "site-config": site_config_default2,
  "site-template": site_template_default2,
  "global-config": global_config_default2
};

// plugins/zhao-common/server/src/routes/admin.ts
var admin_default = {
  type: "admin",
  routes: []
};

// plugins/zhao-common/server/src/routes/content-api.ts
var publicRoute = (method, path2, handler) => ({
  method,
  path: `/v1${path2}`,
  handler,
  config: { auth: false }
});
var adminRoute = (method, path2, handler, permission) => ({
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
var strictUserRoute = (method, path2, handler) => ({
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
var content_api_default = () => ({
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

// plugins/zhao-common/server/src/routes/index.ts
var routes_default = {
  admin: admin_default,
  "content-api": content_api_default
};

// plugins/zhao-common/server/src/index.ts
var index_default = {
  register: register_default,
  bootstrap: bootstrap_default,
  config: config_default,
  services: services_default,
  contentTypes: content_types_default,
  controllers: controllers_default,
  policies: policies_default,
  routes: routes_default
};
export {
  index_default as default
};
