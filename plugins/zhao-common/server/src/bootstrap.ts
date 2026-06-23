import type { Core } from "@strapi/strapi";
import siteResolver from "./middlewares/site-resolver";

const SITE_CONFIG_UID = "plugin::zhao-common.site-config";
const TEMPLATE_UID = "plugin::zhao-common.site-template";

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
    thirdPartyEnabled: false,
    ssoEnabled: false,
    ssoLoginUrl: "",
    registerEnabled: true,
    inviteCodeRequired: false,
    wechatMiniProgramEnabled: false,
    wechatOfficialAccountEnabled: false,
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
    debugMode: false,
  },
};

/**
 * 获取所有含 deletedAt 字段的 content-type UID 列表
 */
const getSoftDeleteModels = (strapi: Core.Strapi): string[] =>
  Object.keys(strapi.contentTypes).filter(
    (uid) => "deletedAt" in strapi.contentTypes[uid].attributes
  );

/**
 * 在 beforeFindMany / beforeFindOne / beforeCount 中自动注入 deletedAt: null 过滤
 * 若查询已显式包含 deletedAt 条件则跳过（允许查询已删除记录）
 */
const addDeletedAtFilter = (event: any) => {
  const { params } = event;
  if (!params.where) {
    params.where = {};
  }
  // 已显式指定 deletedAt 条件时跳过
  if ("deletedAt" in params.where) return;
  params.where.deletedAt = null;
};

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  // 注册站点识别中间件（在认证之前）
  strapi.server.use(siteResolver({}, { strapi }));

  // 站点配置初始化
  const existingConfig = await strapi.documents(SITE_CONFIG_UID).findMany();
  if (!existingConfig || (Array.isArray(existingConfig) && existingConfig.length === 0)) {
    // 先确保默认模板存在
    let defaultTemplate: any = null;
    const existingTemplates = await strapi.documents(TEMPLATE_UID).findMany({
      filters: { isDefault: true },
    });
    if (Array.isArray(existingTemplates) && existingTemplates.length > 0) {
      defaultTemplate = existingTemplates[0];
    } else {
      defaultTemplate = await strapi.documents(TEMPLATE_UID).create({
        data: {
          name: "默认模板",
          description: "系统默认配置模板，所有字段均可编辑",
          presetConfig: DEFAULT_SITE_CONFIG.extraConfig,
          fieldConstraints: {},
          enabled: true,
          isDefault: true,
        },
      });
      strapi.log.info(`[zhao-common] 默认模板已初始化`);
    }

    await strapi.documents(SITE_CONFIG_UID).create({
      data: {
        ...DEFAULT_SITE_CONFIG,
        extraConfig: {}, // 差异存储：默认站点关联默认模板，无需重复存储预设值
        template: defaultTemplate?.documentId ?? null,
      },
    });
    strapi.log.info(`[zhao-common] 站点配置已初始化`);
  }

  // 注册 soft-delete 自动过滤生命周期订阅器
  const softDeleteModels = getSoftDeleteModels(strapi);
  if (softDeleteModels.length > 0) {
    strapi.db.lifecycles.subscribe({
      models: softDeleteModels,
      beforeFindMany: addDeletedAtFilter,
      beforeFindOne: addDeletedAtFilter,
      beforeCount: addDeletedAtFilter,
    });
    strapi.log.info(
      `[zhao-common] soft-delete 自动过滤已注册，覆盖 ${softDeleteModels.length} 个 content-type`
    );
  }
};

export default bootstrap;